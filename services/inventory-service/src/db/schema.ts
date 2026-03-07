import { integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const inventories = pgTable('inventories', {
    id: uuid('id').primaryKey().defaultRandom(),
    lensId: uuid('lens_id').notNull(),
    branchCode: varchar('branch_code', { length: 20 }).notNull().references(() => branches.code),    totalQuantity: integer('total_quantity').notNull(),
    availableQuantity: integer('available_quantity').notNull()
});

export const branches = pgTable('branches', {
    code: varchar('code', { length: 20 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 255 }).notNull(),
    description: varchar('description', { length: 255 })
});

export const processedEvents = pgTable('processed_events', {
    eventId: varchar('event_id', { length: 255 }).primaryKey(),
    eventType: varchar('event_type', { length: 255 }).notNull(),
});