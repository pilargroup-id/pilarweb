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
              placeholder="Cari no request, requester, atau tujuan..."
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>
        <button
          @click="fetchApprovals(meta.page)"
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
        <TableHeadCell>Requester</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Target Department</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Return Type</TableHeadCell>
        <TableHeadCell>Reason</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Return Due Date</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="11" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Memuat data approval...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="11" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!approvals.length">
        <td colspan="11" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Tidak ada approval yang perlu diproses.</p>
        </td>
      </tr>
      <tr
        v-for="item in approvals"
        v-else
        :key="item.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <div class="flex items-center gap-2">
            <button
              @click="openDetail(item)"
              type="button"
              title="Detail"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <EyeIcon class="h-4 w-4" />
              Detail
            </button>
            <template v-if="item.request_status === 'PENDING_DEPARTMENT_APPROVAL'">
              <button
                @click="openDecision(item, 'approve')"
                type="button"
                title="Approve"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-success-300 bg-white px-3 py-2 text-theme-sm font-medium text-success-600 shadow-theme-xs hover:bg-success-50 dark:border-success-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
              >
                <CheckIcon class="h-4 w-4" />
                Approve
              </button>
              <button
                @click="openDecision(item, 'cancel')"
                type="button"
                title="Cancel"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-error-300 bg-white px-3 py-2 text-theme-sm font-medium text-error-600 shadow-theme-xs hover:bg-error-50 dark:border-error-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
              >
                <CloseIcon class="h-4 w-4" />
                Cancel
              </button>
            </template>
            <button
              v-else
              @click="openDecision(item, 'revert')"
              type="button"
              title="Revert"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-warning-300 bg-white px-3 py-2 text-theme-sm font-medium text-warning-600 shadow-theme-xs hover:bg-warning-50 dark:border-warning-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              <UndoIcon class="h-4 w-4" />
              Revert
            </button>
          </div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ item.request_number }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.requester_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.department_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.target_department_name || '-' }}</p>
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
        <td class="px-5 py-4 sm:px-6">
          <p class="max-w-xs truncate text-gray-500 text-theme-sm dark:text-gray-400" :title="item.reason || ''">
            {{ item.reason || '-' }}
          </p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.request_status)" size="sm">{{ formatStatusLabel(item.request_status) }}</Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.submitted_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.return_due_date) }}</p>
        </td>
      </tr>

      <template #pagination>
        <TablePagination
          :page="meta.page"
          :limit="meta.limit"
          :total="meta.total"
          :total-pages="meta.totalPages"
          :disabled="isLoading"
          item-label="approvals"
          @update:page="fetchApprovals"
        />
      </template>
    </BaseTable>

    <DialogApprovalDecision
      :is-open="isDecisionOpen"
      :approval="selectedApproval"
      :mode="decisionMode"
      @close="isDecisionOpen = false"
      @decided="handleDecided"
    />

    <DialogRequestDetail
      :is-open="isDetailOpen"
      :request-id="viewingRequestId"
      @close="isDetailOpen = false"
      @changed="fetchApprovals(meta.page)"
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
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Target Department</label>
                <SearchableSelect
                  v-model="draftTargetDepartmentFilter"
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
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { getApprovals, getDepartments, getRequestPurposes } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogApprovalDecision from '@/components/dialog/DialogApprovalDecision.vue'
import DialogRequestDetail from '@/components/dialog/DialogRequestDetail.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import { RefreshIcon, EyeIcon, CheckIcon, CloseIcon, UndoIcon, FilterIcon } from '@/icons'

const approvals = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
let searchTimer = null
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isDecisionOpen = ref(false)
const selectedApproval = ref(null)
const decisionMode = ref('approve')

const isDetailOpen = ref(false)
const viewingRequestId = ref(null)

const isFilterOpen = ref(false)
const statusFilterOptions = [
  { id: '', name: 'Semua status' },
  { id: 'PENDING_DEPARTMENT_APPROVAL', name: 'Pending Department Approval' },
  { id: 'PENDING_FINANCE_REVIEW', name: 'Pending Finance Review' },
]
const returnTypeFilterOptions = [
  { id: '', name: 'Semua tipe' },
  { id: 'RETURNABLE', name: 'Returnable' },
  { id: 'NON_RETURNABLE', name: 'Non-returnable' },
]
const sortOrderOptions = [
  { id: 'desc', name: 'Newest submitted first' },
  { id: 'asc', name: 'Oldest submitted first' },
]

const statusFilter = ref('')
const targetDepartmentFilter = ref('')
const purposeFilter = ref('')
const returnTypeFilter = ref('')
const dateFromFilter = ref('')
const dateToFilter = ref('')
const sortOrder = ref('desc')

const draftStatusFilter = ref('')
const draftTargetDepartmentFilter = ref('')
const draftPurposeFilter = ref('')
const draftReturnTypeFilter = ref('')
const draftDateFromFilter = ref('')
const draftDateToFilter = ref('')
const draftSortOrder = ref('desc')

const hasActiveFilters = computed(
  () =>
    !!statusFilter.value ||
    !!targetDepartmentFilter.value ||
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
  draftTargetDepartmentFilter.value = targetDepartmentFilter.value
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
  targetDepartmentFilter.value = draftTargetDepartmentFilter.value
  purposeFilter.value = draftPurposeFilter.value
  returnTypeFilter.value = draftReturnTypeFilter.value
  dateFromFilter.value = draftDateFromFilter.value
  dateToFilter.value = draftDateToFilter.value
  sortOrder.value = draftSortOrder.value || 'desc'
  isFilterOpen.value = false
  fetchApprovals(1)
}

function resetFilters() {
  statusFilter.value = ''
  targetDepartmentFilter.value = ''
  purposeFilter.value = ''
  returnTypeFilter.value = ''
  dateFromFilter.value = ''
  dateToFilter.value = ''
  sortOrder.value = 'desc'
  isFilterOpen.value = false
  fetchApprovals(1)
}

function openDecision(item, mode) {
  selectedApproval.value = item
  decisionMode.value = mode
  isDecisionOpen.value = true
}

function openDetail(item) {
  viewingRequestId.value = item.request_id
  isDetailOpen.value = true
}

function handleDecided() {
  fetchApprovals(meta.page)
}

const STATUS_BADGE_COLOR = {
  PENDING_DEPARTMENT_APPROVAL: 'warning',
  PENDING_FINANCE_REVIEW: 'info',
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

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

async function fetchApprovals(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getApprovals({
      page,
      limit: meta.limit,
      ...(search.value ? { search: search.value } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
      ...(targetDepartmentFilter.value ? { target_department_id: targetDepartmentFilter.value } : {}),
      ...(purposeFilter.value ? { purpose_id: purposeFilter.value } : {}),
      ...(returnTypeFilter.value ? { return_type: returnTypeFilter.value } : {}),
      ...(dateFromFilter.value ? { date_from: dateFromFilter.value } : {}),
      ...(dateToFilter.value ? { date_to: dateToFilter.value } : {}),
      sort_order: sortOrder.value,
    })
    approvals.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? approvals.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    approvals.value = []
    errorMessage.value = err?.message || 'Gagal memuat data approval.'
  } finally {
    isLoading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchApprovals(1), 400)
}

onMounted(() => fetchApprovals(1))
onUnmounted(() => clearTimeout(searchTimer))
</script>
