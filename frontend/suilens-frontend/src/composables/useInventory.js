import { ref } from 'vue';

const INVENTORY_API = import.meta.env.VITE_INVENTORY_API || 'http://localhost:3004';

const branches = ref([]);

export function useInventory() {
    const loading = ref(false);

    const fetchBranches = async () => {
        if (branches.value.length > 0) return;
        try {
            const res = await fetch(`${INVENTORY_API}/api/branches`);
            if (res.ok) {
                branches.value = await res.json();
            } else {
                console.error('Failed to fetch branches');
            }
        } catch (e) {
            console.error('Error fetching branches', e);
        }
    };

    const fetchInventoryForLens = async (lens) => {
        lens.inventoryLoading = true;
        lens.inventory = [];

        await fetchBranches();

        try {
            const invRes = await fetch(`${INVENTORY_API}/api/inventory/lenses/${lens.id}`);
            if (invRes.ok) {
                const stockData = await invRes.json();

                for (const branch of branches.value) {
                    const branchStock = stockData.find(s => s.branchCode === branch.code);
                    if (branchStock) {
                        lens.inventory.push({
                            branchCode: branch.code,
                            branchName: branch.name,
                            availableQuantity: branchStock.availableQuantity,
                            totalQuantity: branchStock.totalQuantity
                        });
                    } else {
                        lens.inventory.push({
                            branchCode: branch.code,
                            branchName: branch.name,
                            availableQuantity: 0,
                            totalQuantity: 0
                        });
                    }
                }
            } else {
                lens.inventory = branches.value.map(b => ({
                    branchCode: b.code, branchName: b.name, availableQuantity: 0, totalQuantity: 0
                }));
            }
        } catch (e) {
            console.error('Error fetching inventory for lens', lens.id, e);
            lens.inventory = branches.value.map(b => ({
                branchCode: b.code, branchName: b.name, availableQuantity: 0, totalQuantity: 0
            }));
        }

        lens.inventoryLoading = false;
    };

    const fetchInventoryForAllLenses = async (lensesRef) => {
        loading.value = true;
        try {
            await fetchBranches();
            await Promise.all(
                lensesRef.map(lens => fetchInventoryForLens(lens))
            );
        } finally {
            loading.value = false;
        }
    };

    const hasStock = (lens) => {
        if (!lens || !lens.inventory) return false;
        return lens.inventory.some(inv => inv.availableQuantity > 0);
    };

    const getAvailableBranches = (lens) => {
        if (!lens || !lens.inventory) return [];
        return lens.inventory
            .filter(inv => inv.availableQuantity > 0)
            .map(inv => ({
                title: `${inv.branchName} (${inv.availableQuantity} available)`,
                value: inv.branchCode
            }));
    };

    return {
        branches,
        loading,
        fetchBranches,
        fetchInventoryForLens,
        fetchInventoryForAllLenses,
        hasStock,
        getAvailableBranches
    };
}
