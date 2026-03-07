import { db } from './index';
import { branches, inventories } from './schema';

const CATALOG_API_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3001';

const seedBranches = [
    {
        code: 'KB-JKT-S',
        name: 'Komet Biru Jakarta Selatan',
        address: 'Kebayoran Baru, Jakarta Selatan',
        description: 'Studio utama, inventaris terbesar'
    },
    {
        code: 'KB-JKT-E',
        name: 'Komet Biru Jakarta Timur',
        address: 'Jatinegara, Jakarta Timur',
        description: 'Cabang sekunder'
    },
    {
        code: 'KB-JKT-N',
        name: 'Komet Biru Jakarta Utara',
        address: 'Kelapa Gading, Jakarta Utara',
        description: 'Cabang terbaru, stok terbatas'
    }
];

async function seed() {
    console.log('Seeding branch...');
    await db.insert(branches).values(seedBranches);
    console.log(`Seeded ${seedBranches.length} branch.`);

    console.log(`Fetching lenses from catalog service at ${CATALOG_API_URL}/api/lenses...`);
    let lenses: any[] = [];
    try {
        const res = await fetch(`${CATALOG_API_URL}/api/lenses`);
        if (res.ok) {
            lenses = await res.json() as any[];
        }
    } catch (error: any) {
        console.error('Failed to connect to catalog service:', error.message);
    }
    if (lenses.length > 0) {
        const existingInventories = await db.select().from(inventories);
        let seededCount = 0;

        for (const lens of lenses) {
            for (const branch of seedBranches) {
                const exists = existingInventories.some(
                    (inv) => inv.lensId === lens.id && inv.branchCode === branch.code
                );

                if (!exists) {
                    let branchQty = 0;

                    switch (branch.code) {
                        case 'KB-JKT-S':
                            branchQty = 10;
                            break;
                        case 'KB-JKT-E':
                            branchQty = 5;
                            break;
                        case 'KB-JKT-N':
                            branchQty = 2;
                            break;
                        default:
                            branchQty = 3;
                    }

                    await db.insert(inventories).values({
                        lensId: lens.id,
                        branchCode: branch.code,
                        totalQuantity: branchQty,
                        availableQuantity: branchQty
                    });
                    seededCount++;
                }
            }
        }
        console.log(`Seeded ${seededCount} inventory records.`);
    } else {
        console.log('No lenses found to seed inventory.');
    }

    process.exit(0);
}

seed().catch((error) => {
    console.error(error);
    process.exit(1);
});
