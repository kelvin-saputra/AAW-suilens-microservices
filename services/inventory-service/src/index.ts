import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { inventories, processedEvents, branches } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { startConsumer } from './consumer';

startConsumer();

const app = new Elysia()
    .use(cors())
    .get('/health', () => ({ status: 'ok', service: 'inventory-service' }))

    .get('/api/branches', async ({ set }) => {
        try {
            return await db.select().from(branches);
        } catch (error) {
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    })

    .get('/api/inventory/lenses/:lensId', async ({ params, set }) => {
        try {
            const inventoryList = await db
                .select()
                .from(inventories)
                .where(eq(inventories.lensId, params.lensId));

            return inventoryList.map(inv => ({
                branchCode: inv.branchCode,
                availableQuantity: inv.availableQuantity,
                totalQuantity: inv.totalQuantity
            }));
        } catch (error) {
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    })

    .get('/api/inventory/:branchCode/:lensId', async ({ params, set }) => {
        try {
            const inventory = await db
                .select()
                .from(inventories)
                .where(
                    and(
                        eq(inventories.branchCode, params.branchCode),
                        eq(inventories.lensId, params.lensId)
                    )
                );

            if (inventory.length === 0) {
                set.status = 404;
                return { error: 'Inventory not found for this branch and lens' };
            }

            return inventory[0];
        } catch (error) {
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    })

    .get('/api/inventory/:branchCode', async ({ params, set }) => {
        try {
            const inventoryList = await db
                .select()
                .from(inventories)
                .where(eq(inventories.branchCode, params.branchCode));

            return inventoryList;
        } catch (error) {
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    })

    .post('/api/inventory/reserve', async ({ body, set }) => {
        try {
            const { orderId, branchCode, lensId, quantity } = body as { orderId: string, branchCode: string, lensId: string, quantity: number };

            const inventoryList = await db
                .select()
                .from(inventories)
                .where(
                    and(
                        eq(inventories.branchCode, branchCode),
                        eq(inventories.lensId, lensId)
                    )
                );

            if (inventoryList.length === 0) {
                set.status = 404;
                return { error: 'Inventory record not found' };
            }

            const inv = inventoryList[0];
            if (!inv) {
                set.status = 404;
                return { error: 'Inventory record not found' };
            }

            if (inv.availableQuantity < quantity) {
                set.status = 409;
                return { error: 'Insufficient stock available' };
            }

            const updateResult = await db
                .update(inventories)
                .set({ availableQuantity: inv.availableQuantity - quantity })
                .where(eq(inventories.id, inv.id))
                .returning();

            return {
                message: 'Stock reserved successfully',
                inventory: updateResult[0]
            };

        } catch (error) {
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        body: t.Object({
            orderId: t.String(),
            branchCode: t.String(),
            lensId: t.String(),
            quantity: t.Number({ minimum: 1 })
        })
    })

    .post('/api/inventory/release', async ({ body, set }) => {
        try {
            const { branchCode, lensId, quantity, orderId } = body as { branchCode: string, lensId: string, quantity: number, orderId?: string };

            // Idempotency check 
            if (orderId) {
                const insertedEvent = await db
                    .insert(processedEvents)
                    .values({ eventId: `release_${orderId}`, eventType: 'order_cancelled_release' })
                    .onConflictDoNothing()
                    .returning();

                // If the insert didn't return a record, it means it already exists (duplicate)
                if (insertedEvent.length === 0) {
                    return { message: 'Stock already released (idempotent)', idempotent: true };
                }
            }

            const inventoryList = await db
                .select()
                .from(inventories)
                .where(
                    and(
                        eq(inventories.branchCode, branchCode),
                        eq(inventories.lensId, lensId)
                    )
                );

            if (inventoryList.length === 0) {
                set.status = 404;
                return { error: 'Inventory record not found' };
            }

            const inv = inventoryList[0];
            if (!inv) {
                set.status = 404;
                return { error: 'Inventory record not found' };
            }

            if (inv.availableQuantity + quantity > inv.totalQuantity) {
                set.status = 400;
                return { error: 'Cannot release more than total quantity' };
            }

            const updateResult = await db
                .update(inventories)
                .set({ availableQuantity: inv.availableQuantity + quantity })
                .where(eq(inventories.id, inv.id))
                .returning();

            return {
                message: 'Stock released successfully',
                inventory: updateResult[0]
            };

        } catch (error) {
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        body: t.Object({
            branchCode: t.String(),
            lensId: t.String(),
            quantity: t.Number({ minimum: 1 }),
            orderId: t.Optional(t.String())
        })
    })

    .listen(3004);

console.log(`Inventory Service running on port ${app.server?.port}`);
