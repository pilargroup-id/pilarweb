<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div class="relative w-full sm:max-w-[280px]">
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
            placeholder="Search request no, fulfillment no, requester..."
            class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <button
          @click="fetchQueue(meta.page)"
          :disabled="isLoading"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
          Refresh
        </button>
      </template>

      <template #head>
        <TableHeadCell>Action</TableHeadCell>
        <TableHeadCell>Request No</TableHeadCell>
        <TableHeadCell>Fulfillment No</TableHeadCell>
        <TableHeadCell>Requester</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Purpose</TableHeadCell>
        <TableHeadCell>Items</TableHeadCell>
        <TableHeadCell>Actual Qty</TableHeadCell>
        <TableHeadCell>Reject Qty</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Handed Over At</TableHeadCell>
        <TableHeadCell>Received At</TableHeadCell>
        <TableHeadCell>Return Due Date</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="13" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading Handover list...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="13" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!queue.length">
        <td colspan="13" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No handover records found.</p>
        </td>
      </tr>
      <tr
        v-for="item in queue"
        v-else
        :key="item.handover_id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <div class="flex items-center gap-2">
            <button
              v-if="item.handover_status === 'PENDING'"
              @click="openDialog(item)"
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              <CheckIcon class="h-4 w-4" />
              Hand Over
            </button>
            <button
              @click="handlePrintDO(item)"
              type="button"
              :disabled="printingId === item.handover_id"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <PrinterIcon class="h-4 w-4" />
              {{ printingId === item.handover_id ? 'Printing...' : 'Print DO' }}
            </button>
          </div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ item.request_number }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.fulfillment_number || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.requester_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.department_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.request_purpose_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.item_count ?? '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatQty(item.total_actual_qty) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p :class="rejectQtyClass(item.total_rejected_qty)">{{ formatQty(item.total_rejected_qty) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusBadgeColor(item.handover_status)" size="sm">
            {{ formatStatusLabel(item.handover_status) }}
          </Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDateTime(item.handed_over_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDateTime(item.received_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">
            {{ item.requires_return ? formatDate(item.return_due_date) : '-' }}
          </p>
        </td>
      </tr>

      <template #pagination>
        <TablePagination
          :page="meta.page"
          :limit="meta.limit"
          :total="meta.total"
          :total-pages="meta.totalPages"
          :disabled="isLoading"
          item-label="handovers"
          @update:page="fetchQueue"
        />
      </template>
    </BaseTable>

    <DialogInventoryTransfer
      :is-open="isDialogOpen"
      :queue-item="requestToProcess"
      @close="closeDialog"
      @updated="emit('changed')"
      @handed-over="handleHandedOver"
    />

    <Teleport to="body">
      <FFPrintDO
        :active="isPrintingDO"
        :request-number="printItem?.request_number"
        :transfer-number="printTransferNumber"
        :company-name="printItem?.company_name"
        :requester-name="printItem?.requester_name"
        :department-name="printItem?.department_name"
        :source-warehouse-code="printTransfer?.source_warehouse_code"
        :source-warehouse-name="printTransfer?.source_warehouse_name"
        :destination-warehouse-code="printTransfer?.destination_warehouse_code"
        :destination-warehouse-name="printTransfer?.destination_warehouse_name"
        :transfer-date="printTransfer?.transfer_date"
        :note="printTransfer?.note"
        :printed-at="printDoPrintedAt"
        :rows="printDoRows"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { getWarehouseHandovers, getWarehouseRequestDetail } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogInventoryTransfer from '@/components/dialog/DialogInventoryTransfer.vue'
import FFPrintDO from '@/components/layout/print/FFPrintDO.vue'
import { RefreshIcon, CheckIcon, PrinterIcon } from '@/icons'

const emit = defineEmits(['changed'])

const queue = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
let searchTimer = null
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isDialogOpen = ref(false)
const requestToProcess = ref(null)

function openDialog(item) {
  requestToProcess.value = {
    id: item.request_id,
    request_number: item.request_number,
    requester_name: item.requester_name,
    department_name: item.department_name,
  }
  isDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
  requestToProcess.value = null
}

function handleHandedOver() {
  closeDialog()
  emit('changed')
}

const printingId = ref(null)
const isPrintingDO = ref(false)
const printItem = ref(null)
const printFulfillment = ref(null)
const printDoPrintedAt = ref(null)

const printTransferNumber = computed(() => {
  const transfers = printFulfillment.value?.inventory_transfers || []
  return transfers.map((t) => t.inventory_transfer_number).join(', ')
})

const printTransfer = computed(() => {
  const transfers = printFulfillment.value?.inventory_transfers || []
  return transfers[transfers.length - 1] || null
})

const printDoRows = computed(() => {
  if (!printFulfillment.value) return []
  const itemsById = new Map((printFulfillment.value.items || []).map((item) => [Number(item.id), item]))
  const rows = []
  for (const transfer of printFulfillment.value.inventory_transfers || []) {
    for (const ti of transfer.items || []) {
      rows.push({
        id: ti.id,
        item_code: ti.item_code,
        item_name: itemsById.get(Number(ti.fulfillment_item_id))?.item_name || '',
        qty: ti.transferred_qty,
      })
    }
  }
  return rows
})

async function handlePrintDO(item) {
  printingId.value = item.handover_id
  try {
    const res = await getWarehouseRequestDetail(item.request_id)
    const detail = res?.data
    const fulfillment = (detail?.fulfillments || []).find((f) => Number(f.id) === Number(item.fulfillment_id))
    if (!fulfillment) {
      window.alert('Fulfillment data was not found for this handover.')
      return
    }
    printItem.value = { ...item, company_name: detail?.company_name }
    printFulfillment.value = fulfillment
    printDoPrintedAt.value = new Date()
    isPrintingDO.value = true
    await nextTick()
    const originalTitle = document.title
    document.title = ' '
    window.print()
    document.title = originalTitle
  } catch (err) {
    window.alert(err?.message || 'Failed to load data for printing.')
  } finally {
    printingId.value = null
    isPrintingDO.value = false
  }
}

const formatStatusLabel = (status) => {
  if (!status) return '-'
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const STATUS_BADGE_COLOR = {
  PENDING: 'warning',
  HANDED_OVER: 'info',
  RECEIVED: 'success',
}

const statusBadgeColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const formatQty = (value) => {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return '-'
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

const rejectQtyClass = (value) => {
  const num = Number(value ?? 0)
  return num > 0
    ? 'text-theme-sm font-medium text-error-600 dark:text-error-500'
    : 'text-theme-sm text-gray-400 dark:text-gray-500'
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

// Section 15: Handover menu lists all handover records visible to Warehouse,
// rather than deriving the list from the Warehouse Request Queue.
async function fetchQueue(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getWarehouseHandovers({
      page,
      limit: meta.limit,
      ...(search.value ? { search: search.value } : {}),
    })
    queue.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? queue.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    queue.value = []
    errorMessage.value = err?.message || 'Failed to load Handover list.'
  } finally {
    isLoading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchQueue(1), 400)
}

onMounted(() => fetchQueue(1))
onUnmounted(() => clearTimeout(searchTimer))

defineExpose({ refresh: fetchQueue })
</script>
