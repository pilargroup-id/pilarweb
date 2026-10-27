<template>
  <div class="space-y-5">
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
              placeholder="Cari no request, no fulfillment, requester..."
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
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
        <TableHeadCell>Return Type</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Actual Qty</TableHeadCell>
        <TableHeadCell>Handed Over By</TableHeadCell>
        <TableHeadCell>Handed Over At</TableHeadCell>
        <TableHeadCell>DO Prints</TableHeadCell>
        <TableHeadCell>Last DO Printed At</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="13" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Memuat daftar handover...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="13" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!queue.length">
        <td colspan="13" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Tidak ada data handover.</p>
        </td>
      </tr>
      <tr
        v-for="item in queue"
        v-else
        :key="item.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <div class="flex items-center gap-2">
            <button
              @click="handleViewDetail(item)"
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <EyeIcon class="h-4 w-4" />
              Detail
            </button>
            <button
              @click="handlePrintDO(item)"
              type="button"
              :disabled="printingId === item.id"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <PrinterIcon class="h-4 w-4" />
              {{ printingId === item.id ? 'Printing...' : 'Reprint DO' }}
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
          <Badge v-if="item.purpose_return_type" :color="returnTypeColor(item.purpose_return_type)" size="sm">
            {{ formatReturnType(item.purpose_return_type) }}
          </Badge>
          <p v-else class="text-gray-500 text-theme-sm dark:text-gray-400">-</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.request_status)" size="sm">{{ formatStatusLabel(item.request_status) }}</Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatQty(item.total_actual_qty) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.last_do_printed_by_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDateTime(item.dispatched_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.do_print_count ?? '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDateTime(item.last_do_printed_at) }}</p>
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

    <Teleport to="body">
      <FFPrintFulfillmentDo
        :active="isPrintingDO"
        :request-number="printItem?.request_number"
        :fulfillment-number="printItem?.fulfillment_number"
        :company-name="printItem?.company_name"
        :requester-name="printItem?.requester_name"
        :department-name="printItem?.department_name"
        :inventory-transfer-number="printFulfillment?.inventory_transfer_number"
        :note="printItem?.note"
        :printed-at="printDoPrintedAt"
        :rows="printDoRows"
      />
    </Teleport>

    <DialogRequestDetail
      :is-open="isDetailOpen"
      :request-id="viewingRequestId"
      @close="isDetailOpen = false"
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
                  placeholder="Semua status"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Department</label>
                <SearchableSelect
                  v-model="draftDepartmentFilter"
                  :options="departmentOptions"
                  :disabled="isLoadingFilterMaster"
                  placeholder="Semua departemen"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Request Purpose</label>
                <SearchableSelect
                  v-model="draftPurposeFilter"
                  :options="purposeOptions"
                  :disabled="isLoadingFilterMaster"
                  placeholder="Semua tujuan"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Return Type</label>
                <SearchableSelect
                  v-model="draftReturnTypeFilter"
                  :options="returnTypeFilterOptions"
                  placeholder="Semua tipe"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Handed Over Date Range</label>
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
import { reactive, ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { getWarehouseFulfillments, getWarehouseFulfillmentDetail, getDepartments, getRequestPurposes } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import FFPrintFulfillmentDo from '@/components/layout/print/FFPrintFulfillmentDo.vue'
import DialogRequestDetail from '@/components/dialog/DialogRequestDetail.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import { RefreshIcon, PrinterIcon, EyeIcon, FilterIcon, CloseIcon } from '@/icons'

const emit = defineEmits(['changed'])

const queue = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
let searchTimer = null
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const printingId = ref(null)
const isPrintingDO = ref(false)
const printItem = ref(null)
const printFulfillment = ref(null)
const printDoPrintedAt = ref(null)

const isDetailOpen = ref(false)
const viewingRequestId = ref(null)

const isFilterOpen = ref(false)
const statusFilterOptions = [
  { id: '', name: 'Semua status' },
  { id: 'DISPATCHED', name: 'Dispatched' },
  { id: 'PARTIALLY_RECEIVED', name: 'Partially Received' },
  { id: 'RETURN_PENDING', name: 'Return Pending' },
  { id: 'COMPLETED', name: 'Completed' },
]
const returnTypeFilterOptions = [
  { id: '', name: 'Semua tipe' },
  { id: 'RETURNABLE', name: 'Returnable' },
  { id: 'NON_RETURNABLE', name: 'Non-returnable' },
]
const sortOrderOptions = [
  { id: 'desc', name: 'Newest handed over first' },
  { id: 'asc', name: 'Oldest handed over first' },
]

const statusFilter = ref('')
const departmentFilter = ref('')
const purposeFilter = ref('')
const returnTypeFilter = ref('')
const dateFromFilter = ref('')
const dateToFilter = ref('')
const sortOrder = ref('desc')

const draftStatusFilter = ref('')
const draftDepartmentFilter = ref('')
const draftPurposeFilter = ref('')
const draftReturnTypeFilter = ref('')
const draftDateFromFilter = ref('')
const draftDateToFilter = ref('')
const draftSortOrder = ref('desc')

const hasActiveFilters = computed(
  () =>
    !!statusFilter.value ||
    !!departmentFilter.value ||
    !!purposeFilter.value ||
    !!returnTypeFilter.value ||
    !!dateFromFilter.value ||
    !!dateToFilter.value ||
    sortOrder.value !== 'desc'
)

const departments = ref([])
const purposes = ref([])
const isLoadingFilterMaster = ref(false)
let filterMasterLoaded = false

function deptId(item) {
  return item?.id ?? item?.department_id ?? item?.code ?? ''
}

function deptLabel(item) {
  return item?.name || item?.department_name || item?.display_name || String(deptId(item))
}

const departmentOptions = computed(() => [
  { id: '', name: 'Semua departemen' },
  ...departments.value.map((dept) => ({ id: deptId(dept), name: deptLabel(dept) })),
])

const purposeOptions = computed(() => [
  { id: '', name: 'Semua tujuan' },
  ...purposes.value.map((purpose) => ({
    id: purpose.id,
    name: purpose.name,
    badge: purpose.return_type === 'RETURNABLE' ? 'Returnable' : 'Non-returnable',
    badgeColor: purpose.return_type === 'RETURNABLE' ? 'success' : 'light',
  })),
])

async function loadFilterMaster() {
  if (filterMasterLoaded) return
  isLoadingFilterMaster.value = true
  try {
    const [deptRes, purposeRes] = await Promise.all([getDepartments(), getRequestPurposes()])
    departments.value = Array.isArray(deptRes?.data) ? deptRes.data : []
    purposes.value = Array.isArray(purposeRes?.data) ? purposeRes.data : []
    filterMasterLoaded = true
  } catch {
    departments.value = []
    purposes.value = []
  } finally {
    isLoadingFilterMaster.value = false
  }
}

function openFilter() {
  draftStatusFilter.value = statusFilter.value
  draftDepartmentFilter.value = departmentFilter.value
  draftPurposeFilter.value = purposeFilter.value
  draftReturnTypeFilter.value = returnTypeFilter.value
  draftDateFromFilter.value = dateFromFilter.value
  draftDateToFilter.value = dateToFilter.value
  draftSortOrder.value = sortOrder.value
  isFilterOpen.value = true
  loadFilterMaster()
}

function applyFilters() {
  statusFilter.value = draftStatusFilter.value
  departmentFilter.value = draftDepartmentFilter.value
  purposeFilter.value = draftPurposeFilter.value
  returnTypeFilter.value = draftReturnTypeFilter.value
  dateFromFilter.value = draftDateFromFilter.value
  dateToFilter.value = draftDateToFilter.value
  sortOrder.value = draftSortOrder.value || 'desc'
  isFilterOpen.value = false
  fetchQueue(1)
}

function resetFilters() {
  statusFilter.value = ''
  departmentFilter.value = ''
  purposeFilter.value = ''
  returnTypeFilter.value = ''
  dateFromFilter.value = ''
  dateToFilter.value = ''
  sortOrder.value = 'desc'
  isFilterOpen.value = false
  fetchQueue(1)
}

function handleViewDetail(item) {
  viewingRequestId.value = item.request_id
  isDetailOpen.value = true
}

const printDoRows = computed(() =>
  (printFulfillment.value?.items || []).map((item) => ({
    id: item.id,
    item_name: item.item_name,
    item_code: item.item_code,
    actual_qty: item.actual_qty,
    source_warehouse_code: item.source_warehouse_code,
  }))
)

// Section 18/19: Handover is a history list, not an action queue. Reprinting
// the DO only needs the fulfillment detail -- fetched directly by its own id.
async function handlePrintDO(item) {
  printingId.value = item.id
  try {
    const res = await getWarehouseFulfillmentDetail(item.id)
    const fulfillment = res?.data
    if (!fulfillment) {
      window.alert('Fulfillment data was not found for this handover.')
      return
    }
    printItem.value = item
    printFulfillment.value = fulfillment
    printDoPrintedAt.value = new Date()
    isPrintingDO.value = true
    await nextTick()
    const originalTitle = document.title
    document.title = ' '
    window.print()
    document.title = originalTitle
  } catch (err) {
    window.alert(err?.message || 'Gagal memuat data untuk dicetak.')
  } finally {
    printingId.value = null
    isPrintingDO.value = false
  }
}

const STATUS_BADGE_COLOR = {
  DISPATCHED: 'primary',
  PARTIALLY_RECEIVED: 'warning',
  RETURN_PENDING: 'info',
  COMPLETED: 'success',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const returnTypeColor = (returnType) => (returnType === 'RETURNABLE' ? 'success' : 'light')

const formatReturnType = (returnType) => (returnType === 'RETURNABLE' ? 'Returnable' : 'Non-returnable')

const formatStatusLabel = (status) => {
  if (!status) return '-'
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const formatQty = (value) => {
  const num = Number(value ?? 0)
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

// Section 9/15/22: There is no dedicated Handover endpoint anymore -- a
// "handover" is simply a PHYSICAL fulfillment that has reached DISPATCHED
// (DO printed). This list reuses the warehouse fulfillments endpoint scoped
// to that status, with request_status used to track what happened since.
async function fetchQueue(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getWarehouseFulfillments({
      page,
      limit: meta.limit,
      status: 'DISPATCHED',
      mode: 'PHYSICAL',
      ...(search.value ? { search: search.value } : {}),
      ...(statusFilter.value ? { request_status: statusFilter.value } : {}),
      ...(departmentFilter.value ? { department_id: departmentFilter.value } : {}),
      ...(purposeFilter.value ? { purpose_id: purposeFilter.value } : {}),
      ...(returnTypeFilter.value ? { return_type: returnTypeFilter.value } : {}),
      ...(dateFromFilter.value ? { date_from: dateFromFilter.value } : {}),
      ...(dateToFilter.value ? { date_to: dateToFilter.value } : {}),
      sort_order: sortOrder.value,
    })
    queue.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? queue.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    queue.value = []
    errorMessage.value = err?.message || 'Gagal memuat daftar handover.'
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
