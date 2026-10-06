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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Inventory Transfer &amp; Handover</h4>
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
          <div v-else class="flex flex-col gap-6">
            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>
            <div v-if="infoMessage" class="flex items-center gap-3">
              <p class="text-sm text-success-600 dark:text-success-500">{{ infoMessage }}</p>
              <button
                v-if="lastCreatedTransfer"
                @click="handlePrintDO"
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <PrinterIcon class="h-3.5 w-3.5" />
                Print DO
              </button>
            </div>

            <!-- Coverage per fulfillment item -->
            <div>
              <h5 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Transfer Coverage</h5>
              <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actual Qty</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Transferred</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Remaining</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr v-for="row in coverageRows" :key="row.id">
                      <td class="px-4 py-3 align-top">
                        <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ row.item_name }}</span>
                        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.item_code }}</span>
                      </td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ row.actual_qty }}</td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ row.transferred }}</td>
                      <td class="px-4 py-3 align-top">
                        <Badge :color="row.remaining > 0 ? 'warning' : 'success'" size="sm">{{ row.remaining }}</Badge>
                      </td>
                    </tr>
                    <tr v-if="!coverageRows.length">
                      <td colspan="4" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        No issued quantity requires Inventory Transfer.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Existing Inventory Transfer records -->
            <div>
              <h5 class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Inventory Transfer Records</h5>
              <div v-if="!fulfillment?.inventory_transfers?.length" class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No Inventory Transfer has been recorded yet.
              </div>
              <div v-else class="flex flex-col gap-3">
                <div
                  v-for="transfer in fulfillment.inventory_transfers"
                  :key="transfer.id"
                  class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div v-if="editingTransferId === transfer.id" class="flex flex-col gap-3">
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">IWT Number</label>
                        <input
                          v-model="editForm.inventory_transfer_number"
                          type="text"
                          class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                        />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Destination Warehouse</label>
                        <SelectField v-model="editForm.source_warehouse_code" placeholder="Select destination warehouse">
                          <option v-for="opt in sourceOptions" :key="opt.code" :value="opt.code">{{ opt.code }} &middot; {{ opt.name }}</option>
                        </SelectField>
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Transfer Date</label>
                        <DateField v-model="editForm.transfer_date" />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Note</label>
                        <input
                          v-model="editForm.note"
                          type="text"
                          placeholder="Optional note"
                          class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                        />
                      </div>
                    </div>
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="cancelEdit"
                        type="button"
                        :disabled="isSavingEdit"
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                      >
                        Cancel
                      </button>
                      <button
                        @click="saveEdit(transfer)"
                        type="button"
                        :disabled="isSavingEdit"
                        class="rounded-lg bg-brand-500 px-3 py-2 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {{ isSavingEdit ? 'Saving...' : 'Save' }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {{ transfer.inventory_transfer_number }}
                      </span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                        {{ transfer.source_warehouse_code }} &rarr; {{ transfer.destination_warehouse_code }}
                        &middot; {{ formatDate(transfer.transfer_date) }}
                      </span>
                      <span v-if="transfer.note" class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ transfer.note }}</span>
                      <ul class="mt-1.5 flex flex-col gap-0.5">
                        <li
                          v-for="ti in transfer.items"
                          :key="ti.id"
                          class="text-theme-xs text-gray-500 dark:text-gray-400"
                        >
                          {{ ti.item_code }}: {{ ti.transferred_qty }}
                        </li>
                      </ul>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <button
                        @click="startEdit(transfer)"
                        type="button"
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                      >
                        Edit
                      </button>
                      <button
                        @click="handleDelete(transfer)"
                        type="button"
                        :disabled="isDeletingId === transfer.id"
                        class="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
                      >
                        <TrashIcon class="h-3.5 w-3.5" />
                        {{ isDeletingId === transfer.id ? 'Deleting...' : 'Delete' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add new Inventory Transfer -->
            <div v-if="pendingItems.length" class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h5 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Add Inventory Transfer</h5>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">IWT Number</label>
                  <input
                    v-model="newTransfer.inventory_transfer_number"
                    type="text"
                    placeholder="e.g. IWT2604868"
                    class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Destination Warehouse</label>
                  <SelectField v-model="newTransfer.source_warehouse_code" placeholder="Select destination warehouse">
                    <option v-for="opt in sourceOptions" :key="opt.code" :value="opt.code">{{ opt.code }} &middot; {{ opt.name }}</option>
                  </SelectField>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Transfer Date</label>
                  <DateField v-model="newTransfer.transfer_date" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Note</label>
                  <input
                    v-model="newTransfer.note"
                    type="text"
                    placeholder="Optional note"
                    class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>

              <div class="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Remaining</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Transfer Now</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr v-for="row in pendingItems" :key="row.id">
                      <td class="px-4 py-3 align-top">
                        <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ row.item_name }}</span>
                        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.item_code }}</span>
                      </td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ row.remaining }}</td>
                      <td class="px-4 py-3 align-top">
                        <input
                          v-model.number="newTransfer.itemQty[row.id]"
                          type="number"
                          step="0.01"
                          min="0"
                          :max="row.remaining"
                          disabled
                          class="dark:bg-dark-900 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-4 flex items-center justify-end gap-2">
                <button
                  v-if="lastCreatedTransfer"
                  @click="handlePrintDO"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  <PrinterIcon class="h-4 w-4" />
                  Print DO
                </button>
                <button
                  @click="submitTransfer"
                  type="button"
                  :disabled="isSubmittingTransfer"
                  class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{ isSubmittingTransfer ? 'Saving...' : 'Add Transfer' }}
                </button>
              </div>
            </div>

            <!-- Handover -->
            <div v-if="isReadyForHandover" class="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-500/5">
              <h5 class="mb-1 text-sm font-medium text-gray-800 dark:text-white/90">Ready for Handover</h5>
              <p class="mb-3 text-theme-sm text-gray-600 dark:text-gray-300">
                All issued quantities are covered by Inventory Transfer records. Hand the goods over to the requester to continue.
              </p>
              <textarea
                v-model="handoverNote"
                rows="2"
                placeholder="Optional handover note"
                class="dark:bg-dark-900 mb-3 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              ></textarea>
              <div class="flex justify-end">
                <button
                  @click="handleHandover"
                  type="button"
                  :disabled="isHandingOver"
                  class="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckIcon class="h-4 w-4" />
                  {{ isHandingOver ? 'Handing Over...' : 'Confirm Hand Over' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <Teleport to="body">
    <FFPrintDO
      :request-number="queueItem?.request_number"
      :transfer-number="lastCreatedTransfer?.inventory_transfer_number"
      :company-name="queueItem?.company_name"
      :requester-name="queueItem?.requester_name"
      :department-name="queueItem?.department_name"
      :source-warehouse-code="lastCreatedTransfer?.source_warehouse_code"
      :source-warehouse-name="lastCreatedTransfer?.source_warehouse_name"
      :destination-warehouse-code="lastCreatedTransfer?.destination_warehouse_code"
      :destination-warehouse-name="lastCreatedTransfer?.destination_warehouse_name"
      :transfer-date="lastCreatedTransfer?.transfer_date"
      :note="lastCreatedTransfer?.note"
      :printed-at="printDoPrintedAt"
      :rows="printDoRows"
    />
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import SelectField from '@/components/forms/FormElements/SelectField.vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import FFPrintDO from '@/components/layout/print/FFPrintDO.vue'
import { TrashIcon, CheckIcon, PrinterIcon } from '@/icons'
import {
  getWarehouseRequestDetail,
  getWarehouseLocations,
  createInventoryTransfer,
  updateInventoryTransfer,
  deleteInventoryTransfer,
  handoverFulfillment,
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

const emit = defineEmits(['close', 'updated', 'handedOver'])

const isLoading = ref(false)
const loadError = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const fulfillment = ref(null)
const sourceOptions = ref([])

const isSubmittingTransfer = ref(false)
const isSavingEdit = ref(false)
const isDeletingId = ref('')
const isHandingOver = ref(false)
const handoverNote = ref('')

const lastCreatedTransfer = ref(null)
const printDoPrintedAt = ref(null)

const editingTransferId = ref(null)
const editForm = reactive({
  inventory_transfer_number: '',
  source_warehouse_code: '',
  transfer_date: '',
  note: '',
})

const newTransfer = reactive({
  inventory_transfer_number: '',
  source_warehouse_code: '',
  transfer_date: '',
  note: '',
  itemQty: {},
})

const isReadyForHandover = computed(() => fulfillment.value?.status === 'READY_FOR_HANDOVER')

const coverageRows = computed(() => {
  if (!fulfillment.value) return []
  const transferredById = new Map()
  for (const transfer of fulfillment.value.inventory_transfers || []) {
    for (const ti of transfer.items || []) {
      const id = Number(ti.fulfillment_item_id)
      transferredById.set(id, (transferredById.get(id) || 0) + Number(ti.transferred_qty || 0))
    }
  }
  return (fulfillment.value.items || [])
    .filter((item) => Number(item.actual_qty || 0) > 0)
    .map((item) => {
      const actualQty = Number(item.actual_qty || 0)
      const transferred = transferredById.get(Number(item.id)) || 0
      return {
        id: item.id,
        item_name: item.item_name,
        item_code: item.item_code,
        actual_qty: actualQty,
        transferred,
        remaining: Math.max(0, Math.round((actualQty - transferred) * 100) / 100),
      }
    })
})

const pendingItems = computed(() => coverageRows.value.filter((row) => row.remaining > 0.0001))

const printDoRows = computed(() => {
  if (!lastCreatedTransfer.value) return []
  const itemsById = new Map((fulfillment.value?.items || []).map((item) => [Number(item.id), item]))
  return (lastCreatedTransfer.value.items || []).map((ti) => ({
    id: ti.id,
    item_code: ti.item_code,
    item_name: itemsById.get(Number(ti.fulfillment_item_id))?.item_name || '',
    qty: ti.transferred_qty,
  }))
})

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.queueItem?.id) {
      loadDetail(props.queueItem.id)
      loadSourceOptions()
    } else if (!open) {
      reset()
    }
  }
)

watch(pendingItems, (items) => {
  for (const row of items) {
    if (newTransfer.itemQty[row.id] === undefined) {
      newTransfer.itemQty[row.id] = row.remaining
    }
  }
})

function reset() {
  fulfillment.value = null
  errorMessage.value = ''
  infoMessage.value = ''
  loadError.value = ''
  handoverNote.value = ''
  editingTransferId.value = null
  lastCreatedTransfer.value = null
  resetNewTransferForm()
}

function resetNewTransferForm() {
  newTransfer.inventory_transfer_number = ''
  newTransfer.source_warehouse_code = ''
  newTransfer.transfer_date = ''
  newTransfer.note = ''
  newTransfer.itemQty = {}
}

async function loadDetail(requestId) {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await getWarehouseRequestDetail(requestId)
    const detail = res?.data
    const active = [...(detail?.fulfillments || [])]
      .reverse()
      .find((f) => ['PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER'].includes(f.status)) || null
    fulfillment.value = active
    if (!active) {
      loadError.value = 'This request has no fulfillment pending Inventory Transfer or Handover.'
    }
  } catch (err) {
    loadError.value = err?.message || 'Failed to load fulfillment detail.'
  } finally {
    isLoading.value = false
  }
}

async function loadSourceOptions() {
  try {
    const res = await getWarehouseLocations()
    sourceOptions.value = (res?.data || []).filter((loc) => loc.is_active && !loc.is_loan_warehouse)
  } catch {
    sourceOptions.value = []
  }
}

function close() {
  if (isSubmittingTransfer.value || isSavingEdit.value || isHandingOver.value) return
  emit('close')
}

function toDateInputValue(value) {
  if (!value) return ''
  const text = String(value)
  return text.length >= 10 ? text.slice(0, 10) : text
}

function formatDate(value) {
  const text = toDateInputValue(value)
  if (!text) return '-'
  const date = new Date(`${text}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

async function submitTransfer() {
  if (!fulfillment.value) return
  errorMessage.value = ''
  infoMessage.value = ''

  const itNumber = newTransfer.inventory_transfer_number.trim()
  if (!itNumber) {
    errorMessage.value = 'IT Number is required.'
    return
  }
  if (!newTransfer.source_warehouse_code) {
    errorMessage.value = 'Source warehouse is required.'
    return
  }
  if (!newTransfer.transfer_date) {
    errorMessage.value = 'Transfer date is required.'
    return
  }
  const items = pendingItems.value
    .map((row) => ({ fulfillment_item_id: row.id, transferred_qty: Number(newTransfer.itemQty[row.id] || 0) }))
    .filter((row) => row.transferred_qty > 0)
  if (!items.length) {
    errorMessage.value = 'Enter at least one transfer quantity greater than 0.'
    return
  }

  isSubmittingTransfer.value = true
  try {
    await createInventoryTransfer(fulfillment.value.id, {
      inventory_transfer_number: itNumber,
      source_warehouse_code: newTransfer.source_warehouse_code,
      transfer_date: newTransfer.transfer_date,
      note: newTransfer.note.trim() || null,
      items,
    })
    resetNewTransferForm()
    infoMessage.value = 'Inventory Transfer recorded.'
    await loadDetail(props.queueItem.id)
    lastCreatedTransfer.value = (fulfillment.value?.inventory_transfers || [])
      .find((t) => t.inventory_transfer_number?.toUpperCase() === itNumber.toUpperCase()) || null
    emit('updated')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to record Inventory Transfer.'
  } finally {
    isSubmittingTransfer.value = false
  }
}

function startEdit(transfer) {
  editingTransferId.value = transfer.id
  editForm.inventory_transfer_number = transfer.inventory_transfer_number
  editForm.source_warehouse_code = transfer.source_warehouse_code
  editForm.transfer_date = toDateInputValue(transfer.transfer_date)
  editForm.note = transfer.note || ''
}

function cancelEdit() {
  editingTransferId.value = null
}

async function saveEdit(transfer) {
  errorMessage.value = ''
  isSavingEdit.value = true
  try {
    await updateInventoryTransfer(transfer.id, {
      inventory_transfer_number: editForm.inventory_transfer_number.trim(),
      source_warehouse_code: editForm.source_warehouse_code,
      transfer_date: editForm.transfer_date,
      note: editForm.note.trim() || null,
    })
    editingTransferId.value = null
    infoMessage.value = 'Inventory Transfer updated.'
    await loadDetail(props.queueItem.id)
    emit('updated')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to update Inventory Transfer.'
  } finally {
    isSavingEdit.value = false
  }
}

async function handleDelete(transfer) {
  const confirmed = window.confirm(`Delete Inventory Transfer "${transfer.inventory_transfer_number}"? This cannot be undone.`)
  if (!confirmed) return

  errorMessage.value = ''
  isDeletingId.value = transfer.id
  try {
    await deleteInventoryTransfer(transfer.id)
    infoMessage.value = 'Inventory Transfer deleted.'
    await loadDetail(props.queueItem.id)
    emit('updated')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to delete Inventory Transfer.'
  } finally {
    isDeletingId.value = ''
  }
}

async function handlePrintDO() {
  if (!lastCreatedTransfer.value) return
  printDoPrintedAt.value = new Date()
  await nextTick()
  const originalTitle = document.title
  document.title = ' '
  window.print()
  document.title = originalTitle
}

async function handleHandover() {
  if (!fulfillment.value) return
  errorMessage.value = ''
  isHandingOver.value = true
  try {
    await handoverFulfillment(fulfillment.value.id, { note: handoverNote.value.trim() || null })
    emit('handedOver')
    emit('close')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to hand over fulfillment.'
  } finally {
    isHandingOver.value = false
  }
}
</script>
