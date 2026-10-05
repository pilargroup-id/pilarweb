<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Warehouse Locations</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Active warehouse locations available for requests.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchWarehouseLocations"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
        </div>
      </template>

      <template #head>
        <TableHeadCell>Code</TableHeadCell>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Type</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="4" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading warehouse locations...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="4" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!locations.length">
        <td colspan="4" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No warehouse locations found.</p>
        </td>
      </tr>
      <tr v-else v-for="location in locations" :key="location.id" class="border-t border-gray-100 dark:border-gray-800">
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ location.code }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ location.name }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="location.is_loan_warehouse ? 'warning' : 'light'" size="sm">
            {{ location.is_loan_warehouse ? 'Loan Warehouse' : 'Standard' }}
          </Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="location.is_active ? 'success' : 'light'" size="sm">
            {{ location.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getWarehouseLocations } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import { RefreshIcon } from '@/icons'

const locations = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

async function fetchWarehouseLocations() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getWarehouseLocations()
    locations.value = res?.data ?? []
  } catch (err) {
    locations.value = []
    errorMessage.value = err?.message || 'Failed to load warehouse locations.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchWarehouseLocations())
</script>
