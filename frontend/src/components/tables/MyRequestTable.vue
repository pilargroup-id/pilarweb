<template>
  <div class="space-y-5">
    <Alert
      v-if="createdNotice"
      variant="success"
      title="Request created"
      :message="`Request ${createdNotice} was submitted for Department Approval.`"
    />

    <Alert
      v-if="submitError"
      variant="error"
      title="Submit failed"
      :message="submitError"
    />

    <Alert
      v-if="confirmNotice"
      variant="info"
      title="Nothing to confirm yet"
      :message="confirmNotice"
    />

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
              placeholder="Search request no, workflow, or purpose..."
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchRequests(meta.page)"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
          <button
            @click="isNewRequestOpen = true"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            <PlusIcon class="h-4 w-4" />
            New Request
          </button>
        </div>
      </template>

      <template #head>
        <TableHeadCell>Action</TableHeadCell>
        <TableHeadCell>Request No</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Destination Target</TableHeadCell>
        <TableHeadCell>Reason</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Return Due Date</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading requests...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!requests.length">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">You haven't submitted any requests yet.</p>
          <button
            @click="isNewRequestOpen = true"
            type="button"
            class="mt-3 inline-block text-theme-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Create your first request &rarr;
          </button>
        </td>
      </tr>
      <tr
        v-for="item in requests"
        v-else
        :key="item.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <div class="flex items-center gap-2">
            <button
              @click="handleViewRequest(item)"
              type="button"
              title="View"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <EyeIcon class="h-4 w-4" />
              View
            </button>
            <button
              v-if="isEditable(item.status)"
              @click="handleEditRequest(item)"
              type="button"
              title="Edit"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-light-300 bg-white px-3 py-2 text-theme-sm font-medium text-blue-light-600 shadow-theme-xs hover:bg-blue-light-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-light-800 dark:bg-gray-800 dark:text-blue-light-400 dark:hover:bg-white/[0.03]"
            >
              <PencilIcon class="h-4 w-4" />
              Edit
            </button>
            <button
              v-if="isSubmittable(item.status)"
              @click="handleSubmitRequest(item)"
              :disabled="submittingId === item.id"
              type="button"
              title="Submit for Approval"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              <SendIcon class="h-4 w-4" />
              {{ submittingId === item.id ? 'Submitting...' : 'Submit for Approval' }}
            </button>
            <button
              v-if="isReturnPending(item)"
              @click="handleReturnRequest(item)"
              :disabled="loadingReturnId === item.id"
              type="button"
              title="Submit Return"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-warning-300 bg-white px-3 py-2 text-theme-sm font-medium text-warning-600 shadow-theme-xs hover:bg-warning-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-warning-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              <UndoIcon class="h-4 w-4" />
              {{ loadingReturnId === item.id ? 'Loading...' : 'Return' }}
            </button>
            <button
              v-if="canConfirmDelivery(item)"
              @click="handleConfirmDelivery(item)"
              :disabled="loadingConfirmId === item.id"
              type="button"
              title="Confirm Receipt"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckIcon class="h-4 w-4" />
              {{ loadingConfirmId === item.id ? 'Loading...' : 'Confirm Receipt' }}
            </button>
          </div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ item.request_number }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.request_purpose_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.target_department_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 sm:px-6">
          <p class="max-w-xs truncate text-gray-500 text-theme-sm dark:text-gray-400" :title="item.reason || ''">
            {{ item.reason || '-' }}
          </p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.status)" size="sm">{{ formatStatusLabel(item.status) }}</Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.submitted_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">
            {{ item.purpose_return_type === 'RETURNABLE' ? formatDate(item.return_due_at) : '-' }}
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
          item-label="requests"
          @update:page="fetchRequests"
        />
      </template>
    </BaseTable>

    <DialogNewRequest
      :is-open="isNewRequestOpen"
      @close="isNewRequestOpen = false"
      @created="handleRequestCreated"
    />

    <DialogNewRequest
      :is-open="isEditRequestOpen"
      :request-id="editingRequestId"
      @close="isEditRequestOpen = false"
      @updated="handleRequestUpdated"
    />

    <DialogRequestDetail
      :is-open="isDetailOpen"
      :request-id="viewingRequestId"
      @close="isDetailOpen = false"
      @changed="fetchRequests(meta.page)"
    />

    <DialogSubmitReturn
      :is-open="isSubmitReturnOpen"
      :return-data="returnData"
      :request-number="returnRequestNumber"
      @close="isSubmitReturnOpen = false"
      @submitted="handleReturnSubmitted"
    />

    <DialogConfirmDelivery
      :is-open="isConfirmDeliveryOpen"
      :delivery-item="deliveryToConfirm"
      @close="isConfirmDeliveryOpen = false"
      @confirmed="handleDeliveryConfirmed"
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
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Request Purpose</label>
                <SearchableSelect
                  v-model="draftPurposeFilter"
                  :options="purposeOptions"
                  :disabled="isLoadingFilterMaster"
                  placeholder="All purposes"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Destination Target</label>
                <SearchableSelect
                  v-model="draftTargetDepartmentFilter"
                  :options="departmentOptions"
                  :disabled="isLoadingFilterMaster"
                  placeholder="All targets"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Submitted Date Range</label>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getMyRequests, getRequestById, submitRequest, getDepartments, getRequestPurposes } from '@/service/api'
import { getDisplayName } from '@/service/auth'
import { useNotificationCenter } from '@/composables/useNotificationCenter'
import Alert from '@/components/ui/Alert.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogNewRequest from '@/components/dialog/DialogNewRequest.vue'
import DialogRequestDetail from '@/components/dialog/DialogRequestDetail.vue'
import DialogSubmitReturn from '@/components/dialog/DialogSubmitReturn.vue'
import DialogConfirmDelivery from '@/components/dialog/DialogConfirmDelivery.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import { PlusIcon, RefreshIcon, EyeIcon, PencilIcon, SendIcon, UndoIcon, CheckIcon, FilterIcon, CloseIcon } from '@/icons'

const route = useRoute()
const { pushNotification } = useNotificationCenter()
const createdNotice = ref(typeof route.query.created === 'string' ? route.query.created : '')

function notifyRequestCreated(requestNumber) {
  if (!requestNumber) return
  pushNotification({
    user_name_snapshot: getDisplayName(),
    action: 'REQUEST_SUBMITTED',
    module: 'REQUEST',
    entity_type: 'REQUEST',
    entity_reference: requestNumber,
    entity_name_snapshot: requestNumber,
    description: `Request ${requestNumber} was submitted for Department Approval.`,
  })
}

if (createdNotice.value) {
  notifyRequestCreated(createdNotice.value)
}
const isNewRequestOpen = ref(false)
const isEditRequestOpen = ref(false)
const editingRequestId = ref(null)
const isDetailOpen = ref(false)
const viewingRequestId = ref(null)
const isSubmitReturnOpen = ref(false)
const returnData = ref(null)
const returnRequestNumber = ref('')
const loadingReturnId = ref('')
const isConfirmDeliveryOpen = ref(false)
const deliveryToConfirm = ref(null)
const loadingConfirmId = ref('')

const requests = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const submitError = ref('')
const confirmNotice = ref('')
const submittingId = ref('')
const search = ref('')
let searchTimer = null
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isFilterOpen = ref(false)
const statusFilterOptions = [
  { id: '', name: 'All statuses' },
  { id: 'PENDING_DEPARTMENT_APPROVAL', name: 'Pending Department Approval' },
  { id: 'REVERTED_TO_REQUESTER', name: 'Reverted to Requester' },
  { id: 'PENDING_FINANCE_REVIEW', name: 'Pending Finance Review' },
  { id: 'PICKING', name: 'Picking' },
  { id: 'ADMINISTRATIVE_FULFILLMENT', name: 'Administrative Fulfillment' },
  { id: 'READY_FOR_DISPATCH', name: 'Ready for Dispatch' },
  { id: 'DISPATCHED', name: 'Dispatched' },
  { id: 'PARTIALLY_RECEIVED', name: 'Partially Received' },
  { id: 'RETURN_PENDING', name: 'Return Pending' },
  { id: 'COMPLETED', name: 'Completed' },
  { id: 'REJECTED', name: 'Rejected' },
  { id: 'CANCELED', name: 'Canceled' },
]
const sortOrderOptions = [
  { id: 'desc', name: 'Newest submitted first' },
  { id: 'asc', name: 'Oldest submitted first' },
]

const statusFilter = ref('')
const purposeFilter = ref('')
const targetDepartmentFilter = ref('')
const dateFromFilter = ref('')
const dateToFilter = ref('')
const sortOrder = ref('desc')

const draftStatusFilter = ref('')
const draftPurposeFilter = ref('')
const draftTargetDepartmentFilter = ref('')
const draftDateFromFilter = ref('')
const draftDateToFilter = ref('')
const draftSortOrder = ref('desc')

const hasActiveFilters = computed(
  () =>
    !!statusFilter.value ||
    !!purposeFilter.value ||
    !!targetDepartmentFilter.value ||
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
  { id: '', name: 'All targets' },
  ...departments.value.map((dept) => ({ id: deptId(dept), name: deptLabel(dept) })),
])

const purposeOptions = computed(() => [
  { id: '', name: 'All purposes' },
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
  draftPurposeFilter.value = purposeFilter.value
  draftTargetDepartmentFilter.value = targetDepartmentFilter.value
  draftDateFromFilter.value = dateFromFilter.value
  draftDateToFilter.value = dateToFilter.value
  draftSortOrder.value = sortOrder.value
  isFilterOpen.value = true
  loadFilterMaster()
}

function applyFilters() {
  statusFilter.value = draftStatusFilter.value
  purposeFilter.value = draftPurposeFilter.value
  targetDepartmentFilter.value = draftTargetDepartmentFilter.value
  dateFromFilter.value = draftDateFromFilter.value
  dateToFilter.value = draftDateToFilter.value
  sortOrder.value = draftSortOrder.value || 'desc'
  isFilterOpen.value = false
  fetchRequests(1)
}

function resetFilters() {
  statusFilter.value = ''
  purposeFilter.value = ''
  targetDepartmentFilter.value = ''
  dateFromFilter.value = ''
  dateToFilter.value = ''
  sortOrder.value = 'desc'
  isFilterOpen.value = false
  fetchRequests(1)
}

const SUBMITTABLE_STATUSES = new Set(['DRAFT', 'REVERTED_TO_REQUESTER'])
const EDITABLE_STATUSES = new Set(['DRAFT', 'PENDING_DEPARTMENT_APPROVAL', 'REVERTED_TO_REQUESTER'])

const STATUS_BADGE_COLOR = {
  PENDING_DEPARTMENT_APPROVAL: 'warning',
  REVERTED_TO_REQUESTER: 'warning',
  PENDING_FINANCE_REVIEW: 'warning',
  PICKING: 'info',
  ADMINISTRATIVE_FULFILLMENT: 'info',
  READY_FOR_DISPATCH: 'info',
  DISPATCHED: 'primary',
  PARTIALLY_RECEIVED: 'warning',
  RETURN_PENDING: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
  CANCELED: 'error',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const isSubmittable = (status) => SUBMITTABLE_STATUSES.has(status)
const isEditable = (status) => EDITABLE_STATUSES.has(status)
// RETURN_PENDING covers the whole return lifecycle (awaiting requester
// declaration, then awaiting Warehouse receipt), so it alone can't tell us
// whether the requester still has something to submit. has_pending_return_declaration
// (from request.service.js listMine) narrows it to that first phase, so the
// button disappears once the requester has already declared their return qty.
const isReturnPending = (item) => item.status === 'RETURN_PENDING' && !!item.has_pending_return_declaration
// A resend shipment keeps the parent request at PARTIALLY_RECEIVED (see
// warehouse.service.js printDo: only fulfillment_type=NORMAL sets DISPATCHED),
// so that status can still have a delivery receipt waiting on the requester.
// has_pending_delivery_receipt (from request.service.js listMine) tells us
// whether that's actually the case, vs. still waiting on Warehouse to resolve
// the discrepancy -- in which case there's nothing to confirm yet.
const canConfirmDelivery = (item) =>
  item.status === 'DISPATCHED' || (item.status === 'PARTIALLY_RECEIVED' && !!item.has_pending_delivery_receipt)

function handleEditRequest(item) {
  submitError.value = ''
  editingRequestId.value = item.id
  isEditRequestOpen.value = true
}

function handleRequestUpdated() {
  isEditRequestOpen.value = false
  fetchRequests(meta.page)
}

function handleViewRequest(item) {
  viewingRequestId.value = item.id
  isDetailOpen.value = true
}

async function handleReturnRequest(item) {
  submitError.value = ''
  confirmNotice.value = ''
  loadingReturnId.value = item.id
  try {
    const res = await getRequestById(item.id)
    const detail = res?.data
    if (!detail?.return) {
      submitError.value = `No return record found for ${item.request_number}.`
      return
    }
    returnData.value = detail.return
    returnRequestNumber.value = detail.request_number
    isSubmitReturnOpen.value = true
  } catch (err) {
    submitError.value = err?.message || `Failed to load return for ${item.request_number}.`
  } finally {
    loadingReturnId.value = ''
  }
}

function handleReturnSubmitted() {
  isSubmitReturnOpen.value = false
  fetchRequests(meta.page)
}

async function handleConfirmDelivery(item) {
  submitError.value = ''
  confirmNotice.value = ''
  loadingConfirmId.value = item.id
  try {
    const res = await getRequestById(item.id)
    const detail = res?.data
    const fulfillment = (detail?.fulfillments || [])
      .slice()
      .reverse()
      .find((f) => f.delivery_receipt && f.delivery_receipt.status === 'PENDING')
    if (!fulfillment?.delivery_receipt) {
      // PARTIALLY_RECEIVED covers the window where a discrepancy is still
      // waiting on Warehouse (not yet resolved, or resolved via RESEND but
      // not yet dispatched) -- there is genuinely nothing to confirm yet,
      // so this is informational rather than a failure (see section 12).
      confirmNotice.value =
        item.status === 'PARTIALLY_RECEIVED'
          ? `${item.request_number} is waiting on Warehouse to resolve the delivery discrepancy. You'll be able to confirm again once the replacement shipment is dispatched.`
          : `No pending delivery found for ${item.request_number}.`
      return
    }
    deliveryToConfirm.value = {
      id: fulfillment.delivery_receipt.id,
      request_number: detail.request_number,
      fulfillment_number: fulfillment.fulfillment_number,
    }
    isConfirmDeliveryOpen.value = true
  } catch (err) {
    submitError.value = err?.message || `Failed to load delivery for ${item.request_number}.`
  } finally {
    loadingConfirmId.value = ''
  }
}

function handleDeliveryConfirmed() {
  isConfirmDeliveryOpen.value = false
  fetchRequests(meta.page)
}

async function handleSubmitRequest(item) {
  submitError.value = ''
  confirmNotice.value = ''
  submittingId.value = item.id
  try {
    await submitRequest(item.id)
    await fetchRequests(meta.page)
  } catch (err) {
    submitError.value = err?.message || `Failed to submit request ${item.request_number}.`
  } finally {
    submittingId.value = ''
  }
}

const formatStatusLabel = (status) => {
  if (!status) return '-'
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function handleRequestCreated(payload) {
  isNewRequestOpen.value = false
  createdNotice.value = payload?.request_number || ''
  notifyRequestCreated(createdNotice.value)
  fetchRequests(1)
}

async function fetchRequests(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getMyRequests({
      page,
      limit: meta.limit,
      ...(search.value ? { search: search.value } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
      ...(purposeFilter.value ? { purpose_id: purposeFilter.value } : {}),
      ...(targetDepartmentFilter.value ? { target_department_id: targetDepartmentFilter.value } : {}),
      ...(dateFromFilter.value ? { date_from: dateFromFilter.value } : {}),
      ...(dateToFilter.value ? { date_to: dateToFilter.value } : {}),
      sort_order: sortOrder.value,
    })
    requests.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? requests.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    requests.value = []
    errorMessage.value = err?.message || 'Failed to load requests.'
  } finally {
    isLoading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchRequests(1), 400)
}

onMounted(() => fetchRequests(1))
onUnmounted(() => clearTimeout(searchTimer))
</script>
