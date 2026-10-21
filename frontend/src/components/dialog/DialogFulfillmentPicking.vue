<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Fulfillment / Picking</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ queueItem?.request_number }}
            <span v-if="fulfillment">&middot; {{ fulfillment.fulfillment_number }}</span>
            <span v-if="queueItem?.requester_name">&middot; {{ queueItem.requester_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading fulfillment...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <div v-else class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <div class="flex flex-wrap items-start gap-6">
                <div class="flex flex-col gap-1.5">
                  <span class="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    IWT No. <span v-if="isPicking" class="text-error-500">*</span>
                  </span>
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-if="isPicking"
                      v-model="iwtNumber"
                      @input="iwtNumber = iwtNumber.toUpperCase()"
                      type="text"
                      placeholder="e.g. IT2604868"
                      class="dark:bg-dark-900 w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm uppercase text-gray-800 shadow-theme-xs placeholder:normal-case focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                    />
                    <span v-else class="text-theme-sm text-gray-600 dark:text-gray-300">{{ iwtNumber || '-' }}</span>
                    <span v-if="iwtRecordedAt" class="text-theme-xs text-gray-400 dark:text-gray-500">
                      {{ formatDateTime(iwtRecordedAt) }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <span class="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    Source Warehouse <span v-if="isPicking" class="text-error-500">*</span>
                  </span>
                  <div v-if="isPicking" class="w-72">
                    <SearchableSelect
                      v-model="sourceWarehouseId"
                      :options="warehouseOptions"
                      placeholder="Select warehouse"
                      search-in-field
                    />
                  </div>
                  <span v-else class="text-theme-sm text-gray-600 dark:text-gray-300">{{ sourceWarehouseDisplay || '-' }}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <Badge :color="statusColor(fulfillment?.status)" size="sm">{{ formatStatusLabel(fulfillment?.status) }}</Badge>
                <span v-if="fulfillment?.last_picking_printed_at" class="text-theme-xs text-gray-500 dark:text-gray-400">
                  Picking form printed {{ formatDateTime(fulfillment.last_picking_printed_at) }}
                </span>
                <span v-if="fulfillment?.last_do_printed_at" class="text-theme-xs text-gray-500 dark:text-gray-400">
                  &middot; DO printed {{ formatDateTime(fulfillment.last_do_printed_at) }}
                </span>
              </div>
            </div>

            <div class="overflow-visible rounded-xl border border-gray-200 dark:border-gray-800">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="rounded-tl-xl px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Requested</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Approved (Finance)</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Actual Qty <span v-if="isPicking" class="text-error-500">*</span>
                    </th>
                    <th class="rounded-tr-xl px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Note</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-for="row in rows" :key="row.id">
                    <td class="px-4 py-3 align-top">
                      <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {{ row.item_name }}
                      </span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.item_code }}</span>
                    </td>
                    <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">
                      {{ formatQty(row.requested_qty) }}
                    </td>
                    <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">
                      {{ formatQty(row.approved_qty) }}
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-if="isPicking"
                        v-model.number="row.actual_qty"
                        type="number"
                        step="0.01"
                        min="0"
                        :max="row.approved_qty"
                        @input="sanitizeActualQty(row)"
                        class="dark:bg-dark-900 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                      />
                      <span v-else class="text-theme-sm text-gray-600 dark:text-gray-300">{{ formatQty(row.actual_qty) }}</span>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-if="isPicking"
                        v-model="row.note"
                        type="text"
                        placeholder="Optional note"
                        class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      />
                      <span v-else class="text-theme-sm text-gray-600 dark:text-gray-300">{{ row.note || '-' }}</span>
                    </td>
                  </tr>
                  <tr v-if="!rows.length">
                    <td colspan="5" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      No items on this fulfillment.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>
            <p v-if="infoMessage" class="text-sm text-success-600 dark:text-success-500">{{ infoMessage }}</p>

            <div v-if="isPicking" class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="handlePrintPicking"
                type="button"
                :disabled="isPrintingPicking || !fulfillment"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <PrinterIcon class="h-4 w-4" />
                {{ isPrintingPicking ? 'Printing...' : 'Print Picking Form' }}
              </button>
              <button
                @click="handleSaveProgress"
                type="button"
                :disabled="isSaving || !fulfillment"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <SaveIcon class="h-4 w-4" />
                {{ isSaving ? 'Saving...' : 'Save Progress' }}
              </button>
              <button
                @click="handleCompletePicking"
                type="button"
                :disabled="isCompleting || isSaving || !fulfillment"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckIcon class="h-4 w-4" />
                {{ isCompleting ? 'Completing...' : 'Complete Picking' }}
              </button>
            </div>

            <div v-else-if="fulfillment" class="flex items-center justify-end gap-3 pt-2">
              <input
                v-if="fulfillment.status === 'READY_FOR_DISPATCH'"
                v-model="doNote"
                type="text"
                placeholder="Optional dispatch note"
                class="dark:bg-dark-900 w-64 rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <button
                @click="handlePrintDo"
                type="button"
                :disabled="isPrintingDo"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PrinterIcon class="h-4 w-4" />
                {{ isPrintingDo ? 'Printing...' : (fulfillment.status === 'DISPATCHED' ? 'Reprint Delivery Order' : 'Print Delivery Order') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <Teleport to="body">
    <FFPrintPicking
      :active="isPrintingPicking"
      :request-number="queueItem?.request_number"
      :fulfillment-number="fulfillment?.fulfillment_number"
      :company-name="queueItem?.company_name"
      :requester-name="queueItem?.requester_name"
      :department-name="queueItem?.department_name"
      :request-purpose-name="queueItem?.request_purpose_name"
      :status="fulfillment?.status"
      :printed-at="pickingPrintedAt"
      :rows="printPickingRows"
    />
    <FFPrintFulfillmentDo
      :active="isPrintingDo"
      :request-number="queueItem?.request_number"
      :fulfillment-number="fulfillment?.fulfillment_number"
      :company-name="queueItem?.company_name"
      :requester-name="queueItem?.requester_name"
      :department-name="queueItem?.department_name"
      :source-warehouse-name="sourceWarehouseDisplay"
      :note="doNote"
      :printed-at="doPrintedAt"
      :rows="printDoRows"
    />
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import FFPrintPicking from '@/components/layout/print/FFPrintPicking.vue'
import FFPrintFulfillmentDo from '@/components/layout/print/FFPrintFulfillmentDo.vue'
import { PrinterIcon, SaveIcon, CheckIcon } from '@/icons'
import {
  getWarehouseFulfillmentDetail,
  getWarehouseLocations,
  printPickingForm,
  saveFulfillmentProgress,
  completeFulfillmentPicking,
  printFulfillmentDeliveryOrder,
} from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  queueItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'changed'])

const isLoading = ref(false)
const loadError = ref('')
const isSaving = ref(false)
const isCompleting = ref(false)
const isPrintingPicking = ref(false)
const isPrintingDo = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const fulfillment = ref(null)
const rows = ref([])
const pickingPrintedAt = ref(null)
const doPrintedAt = ref(null)
const doNote = ref('')
const iwtNumber = ref('')
const iwtRecordedAt = ref(null)
const warehouseLocations = ref([])
const sourceWarehouseId = ref('')
let hasChanges = false

const isPicking = computed(() => fulfillment.value?.status === 'PICKING')

const warehouseOptions = computed(() =>
  warehouseLocations.value.map((opt) => ({
    id: opt.id,
    name: `${opt.name} (${opt.code})`,
  }))
)

const sourceWarehouseDisplay = computed(() => {
  const f = fulfillment.value
  if (!f?.source_warehouse_name) return ''
  return f.source_warehouse_code ? `${f.source_warehouse_name} (${f.source_warehouse_code})` : f.source_warehouse_name
})

const printPickingRows = computed(() =>
  rows.value.map((row) => ({
    id: row.id,
    item_name: row.item_name,
    item_code: row.item_code,
    requested_qty: row.requested_qty,
    approved_qty: row.approved_qty,
  }))
)

const printDoRows = computed(() =>
  rows.value.map((row) => ({
    id: row.id,
    item_name: row.item_name,
    item_code: row.item_code,
    actual_qty: row.actual_qty,
    inventory_transfer_number: iwtNumber.value,
  }))
)

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.queueItem?.id) {
      loadWarehouseLocations()
      loadDetail(props.queueItem.id)
    } else if (!open) {
      if (hasChanges) emit('changed')
      reset()
    }
  }
)

function reset() {
  fulfillment.value = null
  rows.value = []
  errorMessage.value = ''
  infoMessage.value = ''
  loadError.value = ''
  doNote.value = ''
  iwtNumber.value = ''
  iwtRecordedAt.value = null
  sourceWarehouseId.value = ''
  hasChanges = false
}

async function loadWarehouseLocations() {
  if (warehouseLocations.value.length) return
  try {
    const res = await getWarehouseLocations()
    warehouseLocations.value = res?.data ?? []
  } catch {
    warehouseLocations.value = []
  }
}

function applyFulfillment(data) {
  fulfillment.value = data
  const items = data?.items || []
  rows.value = items.map((item) => ({
    id: item.id,
    item_name: item.item_name,
    item_code: item.item_code,
    requested_qty: Number(item.requested_qty_snapshot ?? 0),
    approved_qty: Number(item.finance_approved_qty_snapshot ?? 0),
    actual_qty: item.actual_qty === null || item.actual_qty === undefined ? null : Number(item.actual_qty),
    note: item.note || '',
  }))
  iwtNumber.value = data?.inventory_transfer_number || ''
  iwtRecordedAt.value = data?.inventory_transfer_recorded_at || null
  sourceWarehouseId.value = data?.source_warehouse_id ?? ''
}

function sanitizeActualQty(row) {
  let value = Number(row.actual_qty)
  if (Number.isNaN(value)) value = null
  const max = Number(row.approved_qty || 0)
  if (value !== null) {
    if (value > max) value = max
    if (value < 0) value = 0
  }
  row.actual_qty = value
}

async function loadDetail(fulfillmentId) {
  reset()
  isLoading.value = true
  try {
    const res = await getWarehouseFulfillmentDetail(fulfillmentId)
    applyFulfillment(res?.data)
  } catch (err) {
    loadError.value = err?.message || 'Failed to load fulfillment detail.'
  } finally {
    isLoading.value = false
  }
}

function close() {
  if (isSaving.value || isCompleting.value) return
  emit('close')
}

function buildItemsPayload() {
  return rows.value.map((row) => ({
    fulfillment_item_id: row.id,
    actual_qty: row.actual_qty === null || row.actual_qty === '' ? null : Number(row.actual_qty),
    note: row.note?.trim() || null,
  }))
}

function buildPayload() {
  return {
    source_warehouse_id: sourceWarehouseId.value || null,
    inventory_transfer_number: iwtNumber.value?.trim() || null,
    items: buildItemsPayload(),
  }
}

function validateQuantities() {
  for (const row of rows.value) {
    if (row.actual_qty === null) continue
    const actual = Number(row.actual_qty)
    if (Number.isNaN(actual) || actual < 0) {
      return `Actual qty for "${row.item_name}" must be 0 or greater.`
    }
    if (actual > Number(row.approved_qty) + 0.0001) {
      return `Actual qty for "${row.item_name}" cannot exceed the approved quantity (${row.approved_qty}).`
    }
  }
  return ''
}

function validateForComplete() {
  const qtyError = validateQuantities()
  if (qtyError) return qtyError
  if (!iwtNumber.value?.trim()) return 'IWT No. is required.'
  if (!sourceWarehouseId.value) return 'Source warehouse is required.'
  for (const row of rows.value) {
    if (row.actual_qty === null) return `Actual qty is required for "${row.item_name}".`
  }
  return ''
}

async function handleSaveProgress() {
  if (!fulfillment.value) return
  infoMessage.value = ''
  const validationError = validateQuantities()
  if (validationError) {
    errorMessage.value = validationError
    return
  }
  errorMessage.value = ''
  isSaving.value = true
  try {
    const res = await saveFulfillmentProgress(fulfillment.value.id, buildPayload())
    applyFulfillment(res?.data)
    hasChanges = true
    infoMessage.value = 'Picking progress saved.'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to save picking progress.'
  } finally {
    isSaving.value = false
  }
}

async function handleCompletePicking() {
  if (!fulfillment.value) return
  infoMessage.value = ''
  const validationError = validateForComplete()
  if (validationError) {
    errorMessage.value = validationError
    return
  }
  errorMessage.value = ''
  isCompleting.value = true
  try {
    const res = await completeFulfillmentPicking(fulfillment.value.id, buildPayload())
    applyFulfillment(res?.data)
    hasChanges = true
    infoMessage.value = 'Picking completed. Ready for Delivery.'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to complete picking.'
  } finally {
    isCompleting.value = false
  }
}

async function handlePrintPicking() {
  if (!fulfillment.value) return
  errorMessage.value = ''
  infoMessage.value = ''
  isPrintingPicking.value = true
  try {
    const res = await printPickingForm(fulfillment.value.id)
    applyFulfillment(res?.data)
    hasChanges = true
    pickingPrintedAt.value = new Date()
    await nextTick()
    const originalTitle = document.title
    document.title = ' '
    window.print()
    document.title = originalTitle
    infoMessage.value = 'Picking form print recorded.'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to record picking form print.'
  } finally {
    isPrintingPicking.value = false
  }
}

async function handlePrintDo() {
  if (!fulfillment.value) return
  errorMessage.value = ''
  infoMessage.value = ''
  isPrintingDo.value = true
  try {
    const res = await printFulfillmentDeliveryOrder(fulfillment.value.id, { note: doNote.value.trim() || null })
    applyFulfillment(res?.data)
    hasChanges = true
    doPrintedAt.value = new Date()
    await nextTick()
    const originalTitle = document.title
    document.title = ' '
    window.print()
    document.title = originalTitle
    infoMessage.value = fulfillment.value?.status === 'HANDED_OVER'
      ? 'Delivery Order printed. Request handed over.'
      : 'Delivery Order print recorded.'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to record Delivery Order print.'
  } finally {
    isPrintingDo.value = false
  }
}

const STATUS_BADGE_COLOR = {
  PICKING: 'info',
  READY_FOR_DISPATCH: 'warning',
  DISPATCHED: 'success',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const formatStatusLabel = (status) => {
  if (!status) return '-'
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const formatQty = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num % 1 === 0 ? String(num) : num.toFixed(2)
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
</script>
