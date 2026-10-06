<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Financial Closing Setting</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Monthly cut-off configuration used to close financial periods.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchFinancialClosing"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
        </div>
      </template>

      <template #head>
        <TableHeadCell>Closing Day</TableHeadCell>
        <TableHeadCell>Timezone</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Last Updated</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="4" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading financial closing setting...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="4" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!setting">
        <td colspan="4" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No active financial closing configuration.</p>
        </td>
      </tr>
      <tr v-else class="border-t border-gray-100 dark:border-gray-800">
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            Day {{ setting.closing_day }} of each month
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ setting.timezone }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="setting.is_active ? 'success' : 'light'" size="sm">
            {{ setting.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(setting.updated_at) }}</p>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFinancialClosing } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import { RefreshIcon } from '@/icons'

const setting = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function fetchFinancialClosing() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getFinancialClosing()
    setting.value = res?.data ?? null
  } catch (err) {
    setting.value = null
    errorMessage.value = err?.message || 'Failed to load financial closing setting.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchFinancialClosing())
</script>
