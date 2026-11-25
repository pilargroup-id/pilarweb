<template>
  <div class="space-y-5">
    <BaseTable max-height>
      <template #toolbar>
        <div class="flex w-full items-center gap-3 sm:max-w-[640px]">
          <div class="w-48 shrink-0">
            <SearchableSelect
              v-model="statusFilter"
              :options="statusFilterOptions"
              placeholder="Not Grouped"
              @update:model-value="onStatusChange"
            />
          </div>
          <div class="w-44 shrink-0">
            <SearchableSelect
              v-model="companyFilter"
              :options="companyFilterOptions"
              placeholder="All companies"
              @update:model-value="fetchRequests(1)"
            />
          </div>
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
              :placeholder="isGroupedView ? 'Search invoice no, request no, requester...' : 'Search request no, requester, or purpose...'"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <template v-if="selectedCount && !isGroupedView">
            <button
              @click="clearSelection"
              type="button"
              class="text-theme-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear ({{ selectedCount }})
            </button>
            <button
              @click="isGroupingOpen = true"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
            >
              Grouping
              <span class="rounded-full bg-white/20 px-2 py-0.5 text-xs">{{ selectedCount }}</span>
            </button>
          </template>
          <button
            @click="isUngroupOpen = true"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-error-300 bg-error-50 px-4 py-2.5 text-theme-sm font-medium text-error-600 shadow-theme-xs hover:bg-error-100 hover:text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20 dark:hover:text-error-300"
          >
            Ungroup
          </button>
          <button
            @click="fetchRequests(meta.page)"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
        </div>
      </template>

      <template #head>
        <TableHeadCell v-if="!isGroupedView">
          <input
            type="checkbox"
            title="Select all on this page"
            :checked="isAllPageSelected"
            :indeterminate.prop="isSomePageSelected && !isAllPageSelected"
            :disabled="isLoading || !selectableOnPage.length"
            @change="toggleSelectPage($event.target.checked)"
            class="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900"
          />
        </TableHeadCell>
        <TableHeadCell>Action</TableHeadCell>
        <TableHeadCell v-if="isGroupedView">Invoice No</TableHeadCell>
        <TableHeadCell>Request No</TableHeadCell>
        <TableHeadCell>Company</TableHeadCell>
        <TableHeadCell>Requester</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Target Department</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Completed</TableHeadCell>
        <TableHeadCell v-if="isGroupedView">Grouped At</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td :colspan="columnCount" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading requests...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td :colspan="columnCount" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!requests.length">
        <td :colspan="columnCount" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ isGroupedView ? 'No grouped PB yet.' : 'No PB is ready to invoice.' }}</p>
        </td>
      </tr>
      <tr
        v-for="item in requests"
        v-else
        :key="`${item.request_id}-${item.invoice_group_id || ''}`"
        class="border-t border-gray-100 dark:border-gray-800"
        :class="{ 'bg-brand-50/60 dark:bg-brand-500/5': !isGroupedView && isSelected(item) }"
      >
        <td v-if="!isGroupedView" class="px-5 py-4 whitespace-nowrap sm:px-6">
          <input
            type="checkbox"
            :checked="isSelected(item)"
            :disabled="!canSelect(item)"
            :title="canSelect(item) ? '' : 'Only PB from the same company can be grouped'"
            @change="toggleSelect(item, $event.target.checked)"
            class="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900"
          />
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <button
            @click="viewRequest(item)"
            type="button"
            title="View"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <EyeIcon class="h-4 w-4" />
            View
          </button>
        </td>
        <td v-if="isGroupedView" class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span
            class="inline-flex rounded-full bg-success-50 px-2.5 py-0.5 text-theme-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-500"
          >
            {{ item.invoice_number || '-' }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{{ item.request_number }}</span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400" :title="item.item_company_name || ''">
            {{ item.item_company_name || item.item_company_code || 'No company' }}
          </p>
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
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.completed_at) }}</p>
        </td>
        <td v-if="isGroupedView" class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400" :title="item.assigned_by_name ? `by ${item.assigned_by_name}` : ''">
            {{ formatDate(item.assigned_at) }}
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
          @update:limit="(value) => { meta.limit = value; fetchRequests(1) }"
        />
      </template>
    </BaseTable>

    <DialogRequestDetail
      :is-open="isDetailOpen"
      :request-id="viewingRequestId"
      read-only
      @close="isDetailOpen = false"
    />

    <DialogCreateInvoiceGroup
      :is-open="isGroupingOpen"
      :requests="selectedItems"
      @close="isGroupingOpen = false"
      @created="onInvoiceCreated"
    />

    <DialogUngroupInvoice
      :is-open="isUngroupOpen"
      :company-code="companyFilter"
      @close="isUngroupOpen = false"
      @ungrouped="fetchRequests(meta.page)"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { getInvoiceEligibleRequests } from '@/service/api'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogRequestDetail from '@/components/dialog/DialogRequestDetail.vue'
import DialogCreateInvoiceGroup from '@/components/dialog/DialogCreateInvoiceGroup.vue'
import DialogUngroupInvoice from '@/components/dialog/DialogUngroupInvoice.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import { RefreshIcon, EyeIcon } from '@/icons'

const requests = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
const companyFilter = ref('')
const statusFilter = ref('READY')
let searchTimer = null
const meta = reactive({ page: 1, limit: 50, total: 0, totalPages: 1 })

const isDetailOpen = ref(false)
const viewingRequestId = ref(null)
const isGroupingOpen = ref(false)
const isUngroupOpen = ref(false)

const companyFilterOptions = [
  { id: '', name: 'All companies' },
  { id: 'KATO', name: 'PT Kato Piagam Indonesia' },
  { id: 'PNM', name: 'PT Pilar Niaga Makmur' },
]

const statusFilterOptions = [
  { id: 'READY', name: 'Not Grouped' },
  { id: 'GROUPED', name: 'Grouped' },
]
const isGroupedView = computed(() => statusFilter.value === 'GROUPED')
// Ready view: checkbox + 8 columns. Grouped view: no checkbox, adds Invoice No + Grouped At.
const columnCount = computed(() => (isGroupedView.value ? 10 : 9))

function onStatusChange() {
  // SearchableSelect may emit '' when cleared; fall back to the default view
  if (!statusFilter.value) statusFilter.value = 'READY'
  fetchRequests(1)
}

// Selection — keyed by request_id, kept across pages/filters.
// One invoice can only hold PB from a single company. Legacy PB without item_company_code
// (created before the company snapshot existed) can join any group; backend assigns the company.
const selected = ref(new Map())
const selectedCount = computed(() => selected.value.size)
const selectedItems = computed(() => Array.from(selected.value.values()))
const selectedCompany = computed(
  () => selectedItems.value.find((item) => item.item_company_code)?.item_company_code || null
)

const isSelected = (item) => selected.value.has(item.request_id)
const canSelect = (item) =>
  isSelected(item) ||
  !selectedCompany.value ||
  !item.item_company_code ||
  item.item_company_code === selectedCompany.value

const selectableOnPage = computed(() => {
  const company = selectedCompany.value || requests.value.find((item) => item.item_company_code)?.item_company_code
  return requests.value.filter((item) => !item.item_company_code || item.item_company_code === company)
})
const isAllPageSelected = computed(
  () => selectableOnPage.value.length > 0 && selectableOnPage.value.every((item) => isSelected(item))
)
const isSomePageSelected = computed(() => requests.value.some((item) => isSelected(item)))

function toggleSelect(item, checked) {
  const next = new Map(selected.value)
  if (checked && canSelect(item)) next.set(item.request_id, item)
  else next.delete(item.request_id)
  selected.value = next
}

function toggleSelectPage(checked) {
  const next = new Map(selected.value)
  selectableOnPage.value.forEach((item) => {
    if (checked) next.set(item.request_id, item)
    else next.delete(item.request_id)
  })
  selected.value = next
}

function clearSelection() {
  selected.value = new Map()
}

function onInvoiceCreated() {
  clearSelection()
  fetchRequests(1)
}

function viewRequest(item) {
  viewingRequestId.value = item.request_id
  isDetailOpen.value = true
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

let fetchSeq = 0
async function fetchRequests(page = 1) {
  const seq = ++fetchSeq
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getInvoiceEligibleRequests({
      page,
      limit: Math.min(meta.limit, 100), // backend caps limit at 100
      ...(search.value ? { search: search.value } : {}),
      ...(companyFilter.value ? { company_code: companyFilter.value } : {}),
      status: isGroupedView.value ? 'GROUPED' : 'READY',
    })
    // Ignore stale responses when filters changed while this request was in flight
    if (seq !== fetchSeq) return
    requests.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? requests.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    if (seq !== fetchSeq) return
    requests.value = []
    errorMessage.value = err?.message || 'Failed to load requests.'
  } finally {
    if (seq === fetchSeq) isLoading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchRequests(1), 400)
}

onMounted(() => fetchRequests(1))
onUnmounted(() => clearTimeout(searchTimer))
</script>
