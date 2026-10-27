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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">{{ isAdministrative ? 'Fulfillment / Administrative' : 'Fulfillment / Picking' }}</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ queueItem?.request_number }}
            <span v-if="fulfillment">&middot; {{ fulfillment.fulfillment_number }}</span>
            <span v-if="queueItem?.requester_name">&middot; {{ queueItem.requester_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Memuat data fulfillment...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <div v-else class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <div class="flex flex-wrap items-start gap-6">
                <div class="flex flex-col gap-1.5">
                  <span class="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    IWT No. <span v-if="isEditable" class="text-error-500">*</span>
                  </span>
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-if="isEditable"
                      v-model="iwtNumber"
                      @input="iwtNumber = iwtNumber.toUpperCase()"
                      type="text"
                      placeholder="cth. IT2604868"
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
                    Source Warehouse <span v-if="isEditable" class="text-error-500">*</span>
                  </span>
                  <div v-if="isEditable" class="w-72">
                    <SearchableSelect
                      v-model="sourceWarehouseId"
                      :options="warehouseOptions"
                      placeholder="Pilih warehouse"
                    />
                  </div>
                  <span v-else class="text-theme-sm text-gray-600 dark:text-gray-300">{{ sourceWarehouseDisplay || '-' }}</span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge :color="statusColor(fulfillment?.status)" size="sm">{{ formatStatusLabel(fulfillment?.status) }}</Badge>
                  <span v-if="fulfillment?.last_picking_printed_at" class="text-theme-xs text-gray-500 dark:text-gray-400">
                    Picking form printed {{ formatDateTime(fulfillment.last_picking_printed_at) }}
                  </span>
                  <span v-if="fulfillment?.last_do_printed_at" class="text-theme-xs text-gray-500 dark:text-gray-400">
                    &middot; DO printed {{ formatDateTime(fulfillment.last_do_printed_at) }}
                  </span>
                </div>
                <div v-if="isEditable" class="flex items-center gap-2">
                  <button
                    v-if="isPicking"
                    @click="handlePrintPicking"
                    type="button"
                    :disabled="isPrintingPicking || !fulfillment"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                  >
                    <PrinterIcon class="h-4 w-4" />
                    {{ isPrintingPicking ? 'Printing...' : 'Print Picking Form' }}
                  </button>
                  <button
                    @click="handleSaveProgress"
                    type="button"
                    :disabled="isSaving || !fulfillment"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                  >
                    <SaveIcon class="h-4 w-4" />
                    {{ isSaving ? 'Saving...' : 'Save Progress' }}
                  </button>
                </div>
                <div v-if="!isAdministrative && fulfillment?.status === 'READY_FOR_DISPATCH'" class="flex w-64 flex-col items-start gap-1.5">
                  <input
                    v-model="doNote"
                    type="text"
                    placeholder="Catatan pengiriman (opsional)"
                    class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
            </div>

            <div class="overflow-visible rounded-xl border border-gray-200 dark:border-gray-800">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="rounded-tl-xl px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Requested</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">{{ isReturnable ? 'Approved' : 'Approved (Finance)' }}</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Actual Qty <span v-if="isPicking" class="text-error-500">*</span>
                    </th>
                    <th class="rounded-tr-xl px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      Note<span v-if="rows.some(isNoteRequired)" class="text-error-500"> *</span>
                    </th>
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
                        step="1"
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
                        :placeholder="isNoteRequired(row) ? 'Catatan wajib diisi karena actual qty tidak penuh' : 'Catatan (opsional)'"
                        :class="[
                          'dark:bg-dark-900 w-full rounded-lg border bg-transparent px-3 py-2 text-theme-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:placeholder:text-white/30',
                          isNoteRequired(row) && !row.note?.trim()
                            ? 'border-error-300 text-error-600 focus:border-error-300 focus:ring-error-500/10 dark:border-error-500/30 dark:text-error-500'
                            : 'border-gray-300 text-gray-800 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800',
                        ]"
                      />
                      <span v-else class="text-theme-sm text-gray-600 dark:text-gray-300">{{ row.note || '-' }}</span>
                    </td>
                  </tr>
                  <tr v-if="!rows.length">
                    <td colspan="5" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      Tidak ada item pada fulfillment ini.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="isAdministrative && isAdministrativePending" class="text-theme-sm text-gray-500 dark:text-gray-400">
              Fulfillment administratif: barang sudah secara fisik berada di tangan requester, sehingga Actual Qty mengikuti qty yang disetujui Finance. Warehouse hanya perlu mengonfirmasi Source Warehouse dan IWT No. sebelum menyelesaikan.
            </p>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>
            <p v-if="infoMessage" class="text-sm text-success-600 dark:text-success-500">{{ infoMessage }}</p>

            <div v-if="isEditable" class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="handleCompletePicking"
                type="button"
                :disabled="isCompleting || isSaving || !fulfillment"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckIcon class="h-4 w-4" />
                {{ isCompleting ? 'Completing...' : (isAdministrativePending ? 'Complete Administrative Fulfillment' : 'Complete Picking') }}
              </button>
            </div>

            <div v-else-if="fulfillment && !isAdministrative" class="flex items-center justify-end gap-3 pt-2">
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
      :inventory-transfer-number="iwtNumber"
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
const isReturnable = computed(() => fulfillment.value?.purpose_return_type === 'RETURNABLE')
const isAdministrative = computed(() => fulfillment.value?.fulfillment_mode === 'ADMINISTRATIVE')
const isAdministrativePending = computed(() => fulfillment.value?.status === 'ADMINISTRATIVE_PENDING')
const isEditable = computed(() => isPicking.value || isAdministrativePending.value)

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

function isNoteRequired(row) {
  return isPicking.value && row.actual_qty !== null && Number(row.actual_qty) < Number(row.approved_qty)
}

function sanitizeActualQty(row) {
  let value = Number(row.actual_qty)
  if (Number.isNaN(value)) value = null
  if (value !== null) value = Math.trunc(value)
  const max = Math.trunc(Number(row.approved_qty || 0))
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
    loadError.value = err?.message || 'Gagal memuat detail fulfillment.'
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
      return `Actual qty untuk "${row.item_name}" harus 0 atau lebih.`
    }
    if (actual > Number(row.approved_qty) + 0.0001) {
      return `Actual qty untuk "${row.item_name}" tidak boleh melebihi qty yang disetujui (${row.approved_qty}).`
    }
  }
  return ''
}

function validateForComplete() {
  const qtyError = validateQuantities()
  if (qtyError) return qtyError
  if (!iwtNumber.value?.trim()) return 'IWT No. wajib diisi.'
  if (!sourceWarehouseId.value) return 'Source Warehouse wajib diisi.'
  for (const row of rows.value) {
    if (row.actual_qty === null) return `Actual qty wajib diisi untuk "${row.item_name}".`
    if (Number(row.actual_qty) < Number(row.approved_qty) && !row.note?.trim()) {
      return `Catatan wajib diisi untuk "${row.item_name}" karena actual qty tidak penuh.`
    }
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
    const wasAdministrative = isAdministrative.value
    const res = await saveFulfillmentProgress(fulfillment.value.id, buildPayload())
    applyFulfillment(res?.data)
    hasChanges = true
    infoMessage.value = wasAdministrative ? 'Progres tersimpan.' : 'Progres picking tersimpan.'
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal menyimpan progres picking.'
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
    const wasAdministrative = isAdministrative.value
    const res = await completeFulfillmentPicking(fulfillment.value.id, buildPayload())
    applyFulfillment(res?.data)
    hasChanges = true
    infoMessage.value = wasAdministrative
      ? 'Fulfillment administratif selesai.'
      : 'Picking selesai. Siap untuk dikirim.'
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal menyelesaikan picking.'
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
    infoMessage.value = 'Cetak form picking tercatat.'
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal mencatat cetak form picking.'
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
      ? 'Delivery Order dicetak. Request sudah diserahkan.'
      : 'Cetak Delivery Order tercatat.'
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal mencatat cetak Delivery Order.'
  } finally {
    isPrintingDo.value = false
  }
}

const STATUS_BADGE_COLOR = {
  PICKING: 'info',
  ADMINISTRATIVE_PENDING: 'primary',
  READY_FOR_DISPATCH: 'warning',
  DISPATCHED: 'success',
  COMPLETED: 'success',
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
