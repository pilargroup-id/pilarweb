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

    <BaseTable max-height>
      <template #toolbar>
        <div class="flex w-full items-center gap-3 sm:max-w-[280px]">
          <button
            @click="openFilter"
            type="button"
            title="Filter"
            class="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-theme-sm font-medium shadow-theme-xs transition-colors"
            :class="
              hasActiveFilters
                ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200'
            "
          >
            <FilterIcon class="h-4 w-4" />
            <span
              v-if="hasActiveFilters"
              class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 dark:border-gray-900"
            ></span>
          </button>
          <div class="relative w-full">
            <span class="absolute -translate-y-1/2 left-3.5 top-1/2">
              <svg
                class="fill-gray-500 dark:fill-gray-400"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                  fill=""
                />
              </svg>
            </span>
            <input
              v-model="search"
              @input="onSearchInput"
              type="text"
              placeholder="Search period (YYYY-MM)..."
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
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

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isFilterOpen"
          class="fixed inset-0 z-99999 bg-gray-900/50"
          @click="isFilterOpen = false"
        ></div>
      </Transition>

      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="isFilterOpen"
          class="fixed inset-y-0 right-0 z-99999 flex w-full max-w-sm flex-col bg-white shadow-xl dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
        >
          <div class="sidebar-gradient-bg relative flex shrink-0 items-center justify-between gap-3 px-5 py-5">
            <h4 class="text-lg font-semibold text-white">Filter</h4>
            <button
              @click="isFilterOpen = false"
              type="button"
              class="transition-color flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            >
              <CloseIcon class="h-5 w-5" />
            </button>
          </div>

          <div class="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
            <div class="flex flex-col gap-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Status</label>
                <SearchableSelect
                  v-model="draftStatusFilter"
                  :options="statusFilterOptions"
                  placeholder="All statuses"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Closing Date Range</label>
                <div class="grid grid-cols-2 gap-3">
                  <DateField v-model="draftDateFromFilter" />
                  <DateField v-model="draftDateToFilter" />
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Sort Order</label>
                <SearchableSelect
                  v-model="draftSortOrder"
                  :options="sortOrderOptions"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
            <button
              @click="resetFilters"
              type="button"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Reset
            </button>
            <button
              @click="applyFilters"
              type="button"
              class="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
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
const search = ref('')
let searchTimer = null
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
    const res = await getFinancialClosingPeriods({
      page,
      limit: meta.limit,
      ...(search.value ? { search: search.value } : {}),
    })
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

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchPeriods(1), 400)
}

onMounted(() => {
  fetchPeriods(1)
  fetchClosingSetting()
})
onUnmounted(() => clearTimeout(searchTimer))

// Keep the table in sync with closing status changes (e.g. cron jobs) without a manual refresh.
usePolling(() => fetchPeriods(meta.page, { silent: true }), 15000)

defineExpose({ refresh: fetchPeriods })
</script>
