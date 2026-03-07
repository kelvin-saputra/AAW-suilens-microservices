<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <template v-slot:prepend>
        <v-icon icon="mdi-camera-lens"></v-icon>
      </template>
      <v-app-bar-title>Suilens Rental</v-app-bar-title>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container>
        <v-row>
          <v-col cols="12" md="7" lg="8">
            <h2 class="text-h4 font-weight-bold mb-4 text-primary">Available Lenses</h2>

            <div v-if="loadingLenses" class="d-flex justify-center my-8">
              <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>

            <v-alert
              v-else-if="lenses.length === 0"
              type="info"
              variant="tonal"
              text="No lenses available in the catalog right now."
            ></v-alert>

            <v-row v-else>
              <v-col v-for="lens in lenses" :key="lens.id" cols="12" sm="6" lg="4">
                <v-card class="h-100 d-flex flex-column hover-card" elevation="2">
                  <v-img
                    src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop"
                    height="160"
                    cover
                  ></v-img>
                  <v-card-title class="text-h6 pb-1">{{ lens.manufacturerName }}</v-card-title>
                  <v-card-subtitle class="text-body-1 font-weight-medium text-high-emphasis">
                    {{ lens.modelName }}
                  </v-card-subtitle>

                  <v-card-text class="flex-grow-1">
                    <div class="text-h5 text-primary font-weight-bold mt-2">
                      ${{ lens.dayPrice }} <span class="text-body-2 text-disabled">/day</span>
                    </div>

                    <div class="mt-4">
                      <div class="text-subtitle-2 mb-1">Stock Availability:</div>
                      <v-list density="compact" class="pa-0">
                        <v-list-item v-if="lens.inventoryLoading" class="px-0">
                           <v-progress-circular indeterminate size="20" color="primary"></v-progress-circular>
                        </v-list-item>
                        <v-list-item v-else-if="!lens.inventory || lens.inventory.length === 0" class="px-0">
                          <v-chip size="small" color="error">Out of Stock</v-chip>
                        </v-list-item>
                        <v-list-item
                          v-else
                          v-for="inv in lens.inventory"
                          :key="inv.branchCode"
                          class="px-0 min-h-0"
                          style="min-height: 24px"
                        >
                          <span class="text-caption">
                            {{ inv.availableQuantity }} unit(s) in {{ inv.branchName }}
                          </span>
                        </v-list-item>
                      </v-list>
                    </div>
                  </v-card-text>

                  <v-divider></v-divider>
                  <v-card-actions class="pa-3">
                    <v-btn
                      variant="flat"
                      color="primary"
                      block
                      prepend-icon="mdi-cart-plus"
                      @click="selectLens(lens)"
                      :disabled="!hasStock(lens)"
                    >
                      {{ hasStock(lens) ? 'Select' : 'Unavailable' }}
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>

            <!-- Your Orders Section -->
            <v-slide-y-transition>
              <div v-if="orders.length > 0" class="mt-8">
                <h2 class="text-h4 font-weight-bold mb-4">Your Orders</h2>
                <v-card elevation="2">
                  <v-list lines="two">
                    <template v-for="(order, index) in orders" :key="order.id">
                      <v-list-item>
                        <template v-slot:prepend>
                          <v-avatar color="primary-lighten-1" size="48">
                            <v-icon color="white">mdi-camera</v-icon>
                          </v-avatar>
                        </template>

                        <v-list-item-title class="font-weight-bold">
                          {{ order.lensSnapshot.modelName }} | {{ getBranchName(order.branchCode) }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ order.customerName }} ({{ order.customerEmail }})
                        </v-list-item-subtitle>

                        <template v-slot:append>
                          <div class="text-right d-flex flex-column align-end">
                            <div class="text-h6 text-success font-weight-bold">${{ order.totalPrice }}</div>
                            <div class="d-flex align-center mt-1">
                              <v-chip size="small" :color="order.status === 'confirmed' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'" class="mr-2">
                                {{ order.status || 'pending' }}
                              </v-chip>
                              <v-btn
                                v-if="order.status !== 'cancelled'"
                                size="x-small"
                                color="error"
                                variant="outlined"
                                :loading="cancelingOrderId === order.id"
                                @click="cancelOrder(order.id)"
                              >
                                Cancel
                              </v-btn>
                            </div>
                          </div>
                        </template>
                      </v-list-item>
                      <v-divider v-if="index < orders.length - 1" inset></v-divider>
                    </template>
                  </v-list>
                </v-card>
              </div>
            </v-slide-y-transition>
          </v-col>

          <!-- Order Form Section -->
          <v-col cols="12" md="5" lg="4">
            <v-card class="sticky-form rounded-lg" elevation="3">
              <v-toolbar color="surface-light" density="compact">
                <v-toolbar-title class="font-weight-bold text-h6">Place an Order</v-toolbar-title>
              </v-toolbar>

              <v-card-text class="pt-6">
                <v-alert
                  v-if="!selectedLens"
                  type="info"
                  variant="tonal"
                  class="mb-6"
                  icon="mdi-information-outline"
                >
                  Please select a lens from the catalog to continue
                </v-alert>

                <div v-else class="mb-6">
                  <div class="text-caption text-medium-emphasis mb-1">Selected Item</div>
                  <v-card variant="outlined" color="primary" class="bg-primary-lighten-5">
                    <v-list-item>
                      <template v-slot:prepend>
                        <v-avatar color="primary" rounded>
                          <v-icon color="white">mdi-lens</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="font-weight-bold">{{ selectedLens.manufacturerName }}</v-list-item-title>
                      <v-list-item-subtitle>{{ selectedLens.modelName }}</v-list-item-subtitle>
                      <template v-slot:append>
                        <div class="font-weight-bold text-primary">${{ selectedLens.dayPrice }}/d</div>
                      </template>
                    </v-list-item>
                  </v-card>
                  <div class="text-right mt-1">
                    <v-btn size="x-small" variant="text" color="error" @click="selectedLens = null">
                      Clear Selection
                    </v-btn>
                  </div>
                </div>

                <v-form ref="orderForm" @submit.prevent="submitOrder">
                  <v-select
                    v-if="selectedLens"
                    v-model="form.branchCode"
                    :items="getAvailableBranches(selectedLens)"
                    item-title="title"
                    item-value="value"
                    label="Select Branch"
                    prepend-inner-icon="mdi-store"
                    variant="outlined"
                    density="comfortable"
                    required
                    :rules="[v => !!v || 'Branch is required']"
                  ></v-select>

                  <v-text-field
                    v-model="form.customerName"
                    label="Full Name"
                    prepend-inner-icon="mdi-account"
                    variant="outlined"
                    density="comfortable"
                    required
                    :rules="[v => !!v || 'Name is required']"
                  ></v-text-field>

                  <v-text-field
                    v-model="form.customerEmail"
                    label="Email Address"
                    type="email"
                    prepend-inner-icon="mdi-email"
                    variant="outlined"
                    density="comfortable"
                    required
                    :rules="[
                      v => !!v || 'Email is required',
                      v => /.+@.+\..+/.test(v) || 'E-mail must be valid'
                    ]"
                  ></v-text-field>

                  <v-row>
                    <v-col cols="6">
                      <v-text-field
                        v-model="form.startDate"
                        label="Start Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                        required
                        :rules="[v => !!v || 'Start Date is required']"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="form.endDate"
                        label="End Date"
                        type="date"
                        variant="outlined"
                        density="comfortable"
                        required
                        :rules="[v => !!v || 'End Date is required']"
                      ></v-text-field>
                    </v-col>
                  </v-row>

                  <v-alert
                    v-if="orderMessage"
                    :type="orderStatus"
                    variant="tonal"
                    class="mb-4"
                    closable
                  >
                    {{ orderMessage }}
                  </v-alert>

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="submitting"
                    :disabled="!selectedLens || submitting"
                    class="mt-2 text-none"
                    elevation="2"
                  >
                    Confirm Rental
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const CATALOG_API = import.meta.env.VITE_CATALOG_API || 'http://localhost:3001';
const ORDER_API = import.meta.env.VITE_ORDER_API || 'http://localhost:3002';

import { useInventory } from './composables/useInventory';

const lenses = ref([]);
const { branches, hasStock, getAvailableBranches, fetchInventoryForAllLenses } = useInventory();

const orders = ref([]);
const loadingLenses = ref(false);
const submitting = ref(false);
const selectedLens = ref(null);
const orderMessage = ref('');
const orderStatus = ref('success');
const orderForm = ref(null);
const cancelingOrderId = ref(null);

const form = ref({
  customerName: '',
  customerEmail: '',
  branchCode: '',
  startDate: '',
  endDate: ''
});

const fetchLenses = async () => {
  loadingLenses.value = true;
  try {
    const res = await fetch(`${CATALOG_API}/api/lenses`);
    if (res.ok) {
      const data = await res.json();
      lenses.value = data.map(lens => ({ ...lens, inventoryLoading: true, inventory: [] }));

      // Fetch inventory concurrently using composable
      await fetchInventoryForAllLenses(lenses.value);
    } else {
      console.error('Failed to fetch lenses');
    }
  } catch (err) {
    console.error('Error fetching lenses:', err);
  } finally {
    loadingLenses.value = false;
  }
};

const fetchOrders = async () => {
  try {
    const res = await fetch(`${ORDER_API}/api/orders`);
    if (res.ok) {
      orders.value = await res.json();
    }
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
};

const getBranchName = (code) => {
  const branch = branches.value.find(b => b.code === code);
  return branch ? branch.name : code;
};

const selectLens = (lens) => {
  selectedLens.value = lens;
  form.value.branchCode = ''; // Reset branch selection when lens changes
  orderMessage.value = '';
};

const submitOrder = async () => {
  if (!selectedLens.value) {
    orderMessage.value = 'Please select a lens first.';
    orderStatus.value = 'error';
    return;
  }

  if (!orderForm.value) return;
  const { valid } = await orderForm.value.validate();
  if (!valid) return;

  submitting.value = true;
  orderMessage.value = '';

  try {
    const res = await fetch(`${ORDER_API}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName: form.value.customerName,
        customerEmail: form.value.customerEmail,
        branchCode: form.value.branchCode,
        startDate: form.value.startDate,
        endDate: form.value.endDate,
        lensId: selectedLens.value.id
      })
    });

    if (res.ok) {
      orderMessage.value = 'Order placed successfully!';
      orderStatus.value = 'success';
      form.value = {
        customerName: '',
        customerEmail: '',
        branchCode: '',
        startDate: '',
        endDate: ''
      };
      selectedLens.value = null;
      orderForm.value.reset();
      fetchOrders();
    } else {
      const errorData = await res.json();
      orderMessage.value = `Error: ${errorData.error || 'Failed to place order'}`;
      orderStatus.value = 'error';
    }
  } catch (err) {
    console.error('Error placing order:', err);
    orderMessage.value = 'Network error occurred. Make sure APIs are running.';
    orderStatus.value = 'error';
  } finally {
    submitting.value = false;
  }
};

const cancelOrder = async (orderId) => {
  if (!confirm('Are you sure you want to cancel this order?')) return;

  cancelingOrderId.value = orderId;
  orderMessage.value = '';

  try {
    const res = await fetch(`${ORDER_API}/api/orders/${orderId}/cancel`, {
      method: 'PATCH'
    });

    if (res.ok) {
      await fetchOrders();
      await fetchLenses();
      orderMessage.value = 'Order cancelled successfully.';
      orderStatus.value = 'success';
    } else {
      const errorData = await res.json();
      orderMessage.value = `Failed to cancel order: ${errorData.error || 'Unknown error'}`;
      orderStatus.value = 'error';
    }
  } catch (err) {
    console.error('Error cancelling order:', err);
    orderMessage.value = 'Network error while cancelling order.';
    orderStatus.value = 'error';
  } finally {
    cancelingOrderId.value = null;
  }
};

onMounted(() => {
  fetchLenses();
  fetchOrders();
});
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
}
.sticky-form {
  position: sticky;
  top: 80px; /* Accounts for app bar */
}

/* Fix background color issues for Vuetify 3 */
.bg-grey-lighten-4 {
  background-color: rgb(var(--v-theme-surface-light)) !important;
}
</style>
