<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
      >
        <div class="sidebar-gradient-bg relative shrink-0 rounded-t-3xl px-6 py-6 lg:px-8">
          <button
            @click="close"
            type="button"
            class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <svg class="fill-current" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
                fill=""
              />
            </svg>
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">
            Financial Period {{ period?.period_key || '' }}
          </h4>
          <p class="pr-12 text-sm text-white/70">
            Period {{ formatDate(period?.period_start) }} &ndash; {{ formatDate(period?.period_end) }}
            <span v-if="period?.closing_date">&middot; Closing {{ formatDate(period.closing_date) }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading financial period...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <div v-else-if="period" class="flex flex-col gap-6">
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div class="flex flex-wrap items-center gap-4">
                <div>
                  <p class="text-theme-xs text-gray-500 dark:text-gray-400">Status</p>
                  <Badge :color="statusBadgeColor(period.status)" size="md">{{ formatStatusLabel(period.status) }}</Badge>
                </div>
                <div v-if="period.closed_at">
                  <p class="text-theme-xs text-gray-500 dark:text-gray-400">Closed At</p>
                  <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ formatDateTime(period.closed_at) }}</p>
                </div>
                <div v-if="period.closed_by_name">
                  <p class="text-theme-xs text-gray-500 dark:text-gray-400">Closed By</p>
                  <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ period.closed_by_name }}</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-if="period.status === 'OPEN'"
                  @click="handleStartClosing"
                  type="button"
                  :disabled="isActionRunning"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
                >
                  <FlagIcon class="h-4 w-4" />
                  Start Closing
                </button>
                <button
                  v-if="period.status === 'CLOSING'"
                  @click="handleClosePeriod"
                  type="button"
                  :disabled="isActionRunning"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArchiveIcon class="h-4 w-4" />
                  Close Period
                </button>
              </div>
            </div>

            <div v-if="period.status === 'CLOSING'" class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h5 class="mb-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">Generate Inventory Adjustment Batch</h5>
              <p class="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
                Computes adjustment qty (actual issued qty &minus; stock returned qty) for this period. Re-running before the batch is
                posted regenerates its items.
              </p>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div class="flex-1">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Note</label>
                  <input
                    v-model="batchNote"
                    type="text"
                    placeholder="Optional note"
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
                <button
                  @click="handleGenerateBatch"
                  type="button"
                  :disabled="isActionRunning"
                  class="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  <PlusIcon class="h-4 w-4" />
                  {{ latestBatch ? 'Regenerate Batch' : 'Generate Batch' }}
                </button>
              </div>
            </div>

            <p v-if="actionError" class="text-sm text-error-600 dark:text-error-500">{{ actionError }}</p>

            <div>
              <h5 class="mb-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">Inventory Adjustment Batches</h5>
              <p v-if="!period.batches?.length" class="text-theme-sm text-gray-500 dark:text-gray-400">
                No batch has been generated for this period yet.
              </p>
              <div v-else class="flex flex-col gap-4">
                <div
                  v-for="batch in period.batches"
                  :key="batch.id"
                  class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
                >
                  <div class="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-3 dark:bg-white/[0.02]">
                    <div class="flex flex-wrap items-center gap-3">
                      <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ batch.batch_number }}</span>
                      <Badge :color="batch.status === 'POSTED' ? 'success' : 'warning'" size="sm">{{ batch.status }}</Badge>
                      <span v-if="batch.netsuite_reference" class="text-theme-xs text-gray-500 dark:text-gray-400">
                        NetSuite: {{ batch.netsuite_reference }}
                      </span>
                    </div>
                    <button
                      v-if="batch.status === 'DRAFT'"
                      @click="emit('post-batch', batch)"
                      type="button"
                      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
                    >
                      <FileCheckIcon class="h-4 w-4" />
                      Post
                    </button>
                  </div>

                  <div class="max-w-full overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead class="bg-white dark:bg-gray-900">
                        <tr>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Request No</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actual Issued Qty</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Stock Returned Qty</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Adjustment Qty</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Source Warehouse</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Inventory Transfer No.</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr v-for="item in batch.items" :key="item.id">
                          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">{{ item.request_number }}</td>
                          <td class="px-4 py-3 align-top">
                            <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ item.item_name }}</span>
                            <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ item.item_code }}</span>
                          </td>
                          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">{{ formatQty(item.actual_issued_qty) }}</td>
                          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">{{ formatQty(item.returned_qty) }}</td>
                          <td class="px-4 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ formatQty(item.adjustment_qty) }}</td>
                          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">{{ item.source_warehouse_code || '-' }}</td>
                          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">{{ item.inventory_transfer_number || '-' }}</td>
                        </tr>
                        <tr v-if="!batch.items?.length">
                          <td colspan="7" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                            No adjustment items in this batch.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import { FlagIcon, ArchiveIcon, PlusIcon, FileCheckIcon } from '@/icons'
import {
  getFinancialClosingPeriod,
  startFinancialClosingPeriod,
  generateInventoryAdjustmentBatch,
  closeFinancialClosingPeriod,
} from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  periodId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['close', 'changed', 'post-batch'])

const period = ref(null)
const isLoading = ref(false)
const loadError = ref('')
const isActionRunning = ref(false)
const actionError = ref('')
const batchNote = ref('')

const latestBatch = computed(() => period.value?.batches?.[0] || null)

watch(
  () => [props.isOpen, props.periodId],
  ([open, id]) => {
    if (open && id) {
      loadPeriod(id)
    } else if (!open) {
      period.value = null
      loadError.value = ''
      actionError.value = ''
      batchNote.value = ''
    }
  }
)

async function loadPeriod(id) {
  isLoading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    const res = await getFinancialClosingPeriod(id)
    period.value = res?.data ?? null
  } catch (err) {
    period.value = null
    loadError.value = err?.message || 'Failed to load financial period.'
  } finally {
    isLoading.value = false
  }
}

function close() {
  if (isActionRunning.value) return
  emit('close')
}

async function handleStartClosing() {
  if (!period.value) return
  if (!window.confirm(`Start closing period ${period.value.period_key}?`)) return

  actionError.value = ''
  isActionRunning.value = true
  try {
    await startFinancialClosingPeriod(period.value.id)
    await loadPeriod(period.value.id)
    emit('changed')
  } catch (err) {
    actionError.value = err?.message || 'Failed to start closing this period.'
  } finally {
    isActionRunning.value = false
  }
}

async function handleGenerateBatch() {
  if (!period.value) return

  actionError.value = ''
  isActionRunning.value = true
  try {
    await generateInventoryAdjustmentBatch(period.value.id, { note: batchNote.value.trim() || null })
    await loadPeriod(period.value.id)
    emit('changed')
  } catch (err) {
    actionError.value = err?.message || 'Failed to generate the Inventory Adjustment batch.'
  } finally {
    isActionRunning.value = false
  }
}

async function handleClosePeriod() {
  if (!period.value) return
  if (!window.confirm(`Close period ${period.value.period_key}? This cannot be undone.`)) return

  actionError.value = ''
  isActionRunning.value = true
  try {
    await closeFinancialClosingPeriod(period.value.id)
    await loadPeriod(period.value.id)
    emit('changed')
  } catch (err) {
    actionError.value = err?.message || 'Failed to close this period.'
  } finally {
    isActionRunning.value = false
  }
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

const formatQty = (value) => {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return '-'
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

const formatDateTime = (value) => {
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

defineExpose({
  refresh: () => {
    if (period.value) loadPeriod(period.value.id)
  },
})
</script>
