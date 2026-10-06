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
            <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Approved Qty</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actual Qty</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Shortage</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reason</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Remainder</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Note</th>
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
                      {{ row.max_qty }}
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model.number="row.actual_qty"
                        type="number"
                        step="0.01"
                        min="0"
                        :max="row.max_qty"
                        class="dark:bg-dark-900 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                      />
                    </td>
                    <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">
                      {{ shortageQty(row) }}
                    </td>
                    <td class="px-4 py-3 align-top">
                      <SelectField v-model="row.shortage_reason_code" :disabled="shortageQty(row) <= 0" placeholder="Select reason">
                        <option v-for="opt in SHORTAGE_REASONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </SelectField>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <SelectField v-model="row.remainder_disposition" :disabled="shortageQty(row) <= 0" placeholder="Select disposition">
                        <option v-for="opt in REMAINDER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </SelectField>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model="row.shortage_note"
                        type="text"
                        :disabled="shortageQty(row) <= 0"
                        placeholder="Optional note"
                        class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      />
                    </td>
                  </tr>
                  <tr v-if="!rows.length">
                    <td colspan="7" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      No items on this fulfillment.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>
            <p v-if="infoMessage" class="text-sm text-success-600 dark:text-success-500">{{ infoMessage }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="handlePrint"
                type="button"
                :disabled="isPrinting || !fulfillment"
                class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                {{ isPrinting ? 'Printing...' : 'Print' }}
              </button>
              <button
                @click="handleSave"
                type="button"
                :disabled="isSaving || !fulfillment"
                class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                {{ isSaving ? 'Saving...' : 'Save Progress' }}
              </button>
              <button
                @click="handleConfirm"
                type="button"
                :disabled="isConfirming || isSaving || !fulfillment"
                class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isConfirming ? 'Confirming...' : 'Confirm Picking' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import SelectField from '@/components/forms/FormElements/SelectField.vue'
import {
  getWarehouseRequestDetail,
  printFulfillment,
  updateFulfillmentItem,
  confirmFulfillmentPicking,
} from '@/service/api'

const SHORTAGE_REASONS = [
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NOT_FOUND', label: 'Not Found' },
  { value: 'INSUFFICIENT_STOCK', label: 'Insufficient Stock' },
  { value: 'OTHER', label: 'Other' },
]

const REMAINDER_OPTIONS = [
  { value: 'BACKORDER_REMAINDER', label: 'Backorder Remainder' },
  { value: 'CLOSE_SHORT', label: 'Close Short' },
]

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

const emit = defineEmits(['close', 'confirmed'])

const isLoading = ref(false)
const loadError = ref('')
const isSaving = ref(false)
const isPrinting = ref(false)
const isConfirming = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const fulfillment = ref(null)
const rows = ref([])

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.queueItem?.id) {
      loadDetail(props.queueItem.id)
    } else if (!open) {
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
}

function shortageQty(row) {
  return Math.max(0, Number(row.max_qty || 0) - Number(row.actual_qty || 0))
}

async function loadDetail(requestId) {
  reset()
  isLoading.value = true
  try {
    const res = await getWarehouseRequestDetail(requestId)
    const detail = res?.data
    const active = [...(detail?.fulfillments || [])].reverse().find((f) => f.status === 'PICKING') || null
    fulfillment.value = active
    rows.value = (active?.items || []).map((item) => ({
      id: item.id,
      item_name: item.item_name,
      item_code: item.item_code,
      max_qty: Number(item.finance_approved_qty_snapshot ?? 0),
      actual_qty: Number(item.actual_qty ?? 0),
      shortage_reason_code: item.shortage_reason_code || '',
      remainder_disposition: item.remainder_disposition && item.remainder_disposition !== 'NONE'
        ? item.remainder_disposition
        : '',
      shortage_note: item.shortage_note || '',
    }))
    if (!active) {
      loadError.value = 'This request has no fulfillment currently in picking.'
    }
  } catch (err) {
    loadError.value = err?.message || 'Failed to load fulfillment detail.'
  } finally {
    isLoading.value = false
  }
}

function close() {
  if (isSaving.value || isConfirming.value) return
  emit('close')
}

function validateRows() {
  for (const row of rows.value) {
    const actual = Number(row.actual_qty)
    if (Number.isNaN(actual) || actual < 0) {
      return `Actual qty for "${row.item_name}" must be 0 or greater.`
    }
    if (actual > Number(row.max_qty) + 0.0001) {
      return `Actual qty for "${row.item_name}" cannot exceed the approved quantity (${row.max_qty}).`
    }
    if (shortageQty(row) > 0) {
      if (!row.shortage_reason_code) return `Shortage reason is required for "${row.item_name}".`
      if (!row.remainder_disposition) return `Remainder disposition is required for "${row.item_name}".`
    }
  }
  return ''
}

async function saveProgress() {
  if (!fulfillment.value) return false
  const validationError = validateRows()
  if (validationError) {
    errorMessage.value = validationError
    return false
  }
  errorMessage.value = ''
  isSaving.value = true
  try {
    for (const row of rows.value) {
      const shortage = shortageQty(row)
      await updateFulfillmentItem(fulfillment.value.id, row.id, {
        actual_qty: Number(row.actual_qty),
        shortage_reason_code: shortage > 0 ? row.shortage_reason_code : null,
        remainder_disposition: shortage > 0 ? row.remainder_disposition : null,
        shortage_note: row.shortage_note?.trim() || null,
      })
    }
    return true
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to save picking progress.'
    return false
  } finally {
    isSaving.value = false
  }
}

async function handleSave() {
  infoMessage.value = ''
  const ok = await saveProgress()
  if (ok) infoMessage.value = 'Picking progress saved.'
}

async function handlePrint() {
  if (!fulfillment.value) return
  errorMessage.value = ''
  infoMessage.value = ''
  isPrinting.value = true
  try {
    await printFulfillment(fulfillment.value.id)
    infoMessage.value = 'Print event recorded.'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to record print event.'
  } finally {
    isPrinting.value = false
  }
}

async function handleConfirm() {
  infoMessage.value = ''
  const saved = await saveProgress()
  if (!saved || !fulfillment.value) return
  isConfirming.value = true
  errorMessage.value = ''
  try {
    await confirmFulfillmentPicking(fulfillment.value.id)
    emit('confirmed')
    emit('close')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to confirm picking.'
  } finally {
    isConfirming.value = false
  }
}
</script>
