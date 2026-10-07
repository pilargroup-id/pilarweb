<template>
  <div class="space-y-5">
    <div
      class="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div>
        <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Closing Setting</h3>
        <p v-if="isSettingLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading setting...</p>
        <p v-else-if="closingSetting" class="text-sm text-gray-500 dark:text-gray-400">
          Closing Day <span class="font-medium text-gray-700 dark:text-gray-300">{{ closingSetting.closing_day }}</span>
          &middot; Timezone <span class="font-medium text-gray-700 dark:text-gray-300">{{ closingSetting.timezone }}</span>
        </p>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">No closing setting configured yet.</p>
      </div>
      <button
        @click="isSettingDialogOpen = true"
        type="button"
        class="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
      >
        <SettingsIcon class="h-4 w-4" />
        Edit Setting
      </button>
    </div>

    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Financial Closing</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Monthly financial periods and their Inventory Adjustment batches.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchPeriods(meta.page)"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
          <button
            @click="isCreateDialogOpen = true"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            <PlusIcon class="h-4 w-4" />
            New Period
          </button>
        </div>
      </template>

      <template #head>
        <TableHeadCell>Period</TableHeadCell>
        <TableHeadCell>Period Start</TableHeadCell>
        <TableHeadCell>Period End</TableHeadCell>
        <TableHeadCell>Closing Date</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Action</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading financial periods...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!periods.length">
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No financial periods have been created yet.</p>
        </td>
      </tr>
      <tr
        v-for="period in periods"
        v-else
        :key="period.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{{ period.period_key }}</span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(period.period_start) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(period.period_end) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(period.closing_date) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusBadgeColor(period.status)" size="sm">{{ formatStatusLabel(period.status) }}</Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <button
            @click="openDetailDialog(period)"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <EyeIcon class="h-4 w-4" />
            View
          </button>
        </td>
      </tr>

      <template #pagination>
        <TablePagination
          :page="meta.page"
          :limit="meta.limit"
          :total="meta.total"
          :total-pages="meta.totalPages"
          :disabled="isLoading"
          item-label="periods"
          @update:page="fetchPeriods"
        />
      </template>
    </BaseTable>

    <DialogCreateFinancialPeriod
      :is-open="isCreateDialogOpen"
      @close="isCreateDialogOpen = false"
      @created="handlePeriodCreated"
    />

    <DialogFinancialPeriodDetail
      ref="detailDialogRef"
      :is-open="isDetailDialogOpen"
      :period-id="periodIdToView"
      @close="closeDetailDialog"
      @changed="fetchPeriods(meta.page)"
      @post-batch="openPostBatchDialog"
    />

    <DialogPostInventoryAdjustmentBatch
      :is-open="isPostBatchDialogOpen"
      :batch="batchToPost"
      @close="closePostBatchDialog"
      @posted="handleBatchPosted"
    />

    <DialogFinancialClosingSetting
      :is-open="isSettingDialogOpen"
      :setting="closingSetting"
      @close="isSettingDialogOpen = false"
      @saved="handleSettingSaved"
    />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getFinancialClosingPeriods, getFinancialClosing } from '@/service/api'
import { usePolling } from '@/composables/usePolling'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogCreateFinancialPeriod from '@/components/dialog/DialogCreateFinancialPeriod.vue'
import DialogFinancialPeriodDetail from '@/components/dialog/DialogFinancialPeriodDetail.vue'
import DialogPostInventoryAdjustmentBatch from '@/components/dialog/DialogPostInventoryAdjustmentBatch.vue'
import DialogFinancialClosingSetting from '@/components/dialog/DialogFinancialClosingSetting.vue'
import { RefreshIcon, PlusIcon, EyeIcon, SettingsIcon } from '@/icons'

const periods = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isCreateDialogOpen = ref(false)

const isDetailDialogOpen = ref(false)
const periodIdToView = ref(null)
const detailDialogRef = ref(null)

const isPostBatchDialogOpen = ref(false)
const batchToPost = ref(null)

const closingSetting = ref(null)
const isSettingLoading = ref(false)
const isSettingDialogOpen = ref(false)

function openDetailDialog(period) {
  periodIdToView.value = period.id
  isDetailDialogOpen.value = true
}

function closeDetailDialog() {
  isDetailDialogOpen.value = false
  periodIdToView.value = null
}

function handlePeriodCreated() {
  fetchPeriods(1)
}

function openPostBatchDialog(batch) {
  batchToPost.value = batch
  isPostBatchDialogOpen.value = true
}

function closePostBatchDialog() {
  isPostBatchDialogOpen.value = false
  batchToPost.value = null
}

async function handleBatchPosted() {
  await detailDialogRef.value?.refresh()
  await fetchPeriods(meta.page)
}

async function fetchClosingSetting() {
  isSettingLoading.value = true
  try {
    const res = await getFinancialClosing()
    closingSetting.value = res?.data ?? null
  } catch {
    closingSetting.value = null
  } finally {
    isSettingLoading.value = false
  }
}

function handleSettingSaved(setting) {
  closingSetting.value = setting ?? closingSetting.value
  fetchClosingSetting()
}

const formatStatusLabel = (status) => {
  if (!status) return '-'
  return status.charAt(0) + status.slice(1).toLowerCase()
}

const STATUS_BADGE_COLOR = {
  OPEN: 'warning',
  CLOSING: 'info',
  CLOSED: 'success',
}

const statusBadgeColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

async function fetchPeriods(page = 1, { silent = false } = {}) {
  if (!silent) {
    isLoading.value = true
    errorMessage.value = ''
  }
  try {
    const res = await getFinancialClosingPeriods({ page, limit: meta.limit })
    periods.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? periods.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    if (!silent) {
      periods.value = []
      errorMessage.value = err?.message || 'Failed to load financial periods.'
    }
  } finally {
    if (!silent) isLoading.value = false
  }
}

onMounted(() => {
  fetchPeriods(1)
  fetchClosingSetting()
})

// Keep the table in sync with closing status changes (e.g. cron jobs) without a manual refresh.
usePolling(() => fetchPeriods(meta.page, { silent: true }), 15000)

defineExpose({ refresh: fetchPeriods })
</script>
