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
            placeholder="Search request no, workflow, or purpose..."
            class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
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
        <TableHeadCell>Workflow</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Return Due Date</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading requests...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!requests.length">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
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
              :disabled="editingId === item.id"
              type="button"
              title="Edit"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-light-300 bg-white px-3 py-2 text-theme-sm font-medium text-blue-light-600 shadow-theme-xs hover:bg-blue-light-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-light-800 dark:bg-gray-800 dark:text-blue-light-400 dark:hover:bg-white/[0.03]"
            >
              <PencilIcon class="h-4 w-4" />
              {{ editingId === item.id ? 'Loading...' : 'Edit' }}
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
              v-if="isCancellable(item.status)"
              @click="handleCancelRequest(item)"
              type="button"
              title="Cancel"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-error-300 bg-white px-3 py-2 text-theme-sm font-medium text-error-600 shadow-theme-xs hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-error-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              <TrashIcon class="h-4 w-4" />
              Cancel
            </button>
          </div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ item.request_number }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.workflow_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.request_purpose_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.status)" size="sm">{{ formatStatusLabel(item.status) }}</Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">
            {{ item.requires_return ? formatDate(item.return_due_date) : '-' }}
          </p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.submitted_at) }}</p>
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
      :request="editingRequest"
      @close="isEditRequestOpen = false"
      @updated="handleRequestUpdated"
    />

    <DialogCancelRequest
      :is-open="isCancelRequestOpen"
      :request="cancelingRequest"
      @close="isCancelRequestOpen = false"
      @canceled="handleRequestCanceled"
    />

    <DialogRequestDetail
      :is-open="isDetailOpen"
      :request-id="viewingRequestId"
      @close="isDetailOpen = false"
      @changed="fetchRequests(meta.page)"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getMyRequests, submitRequest, getRequestById } from '@/service/api'
import { getDisplayName } from '@/service/auth'
import { useNotificationCenter } from '@/composables/useNotificationCenter'
import Alert from '@/components/ui/Alert.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogNewRequest from '@/components/dialog/DialogNewRequest.vue'
import DialogCancelRequest from '@/components/dialog/DialogCancelRequest.vue'
import DialogRequestDetail from '@/components/dialog/DialogRequestDetail.vue'
import { PlusIcon, RefreshIcon, EyeIcon, PencilIcon, SendIcon, TrashIcon } from '@/icons'

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
const editingRequest = ref(null)
const isCancelRequestOpen = ref(false)
const cancelingRequest = ref(null)
const isDetailOpen = ref(false)
const viewingRequestId = ref(null)

const requests = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const submitError = ref('')
const submittingId = ref('')
const editingId = ref('')
const search = ref('')
let searchTimer = null
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const SUBMITTABLE_STATUSES = new Set(['DRAFT', 'REVERTED_TO_REQUESTER'])
const EDITABLE_STATUSES = new Set(['DRAFT', 'PENDING_DEPARTMENT_APPROVAL', 'REVERTED_TO_REQUESTER'])
const CANCELLABLE_STATUSES = new Set(['DRAFT', 'PENDING_DEPARTMENT_APPROVAL', 'REVERTED_TO_REQUESTER'])

const STATUS_BADGE_COLOR = {
  DRAFT: 'light',
  REVERTED_TO_REQUESTER: 'warning',
  PENDING_DEPARTMENT_APPROVAL: 'warning',
  PENDING_FINANCE_REVIEW: 'warning',
  READY_FOR_WAREHOUSE: 'info',
  PICKING: 'info',
  PENDING_INVENTORY_TRANSFER: 'info',
  READY_FOR_HANDOVER: 'info',
  HANDED_OVER: 'primary',
  RETURN_PENDING: 'warning',
  PARTIALLY_RETURNED: 'warning',
  RETURNED: 'info',
  RETURN_INSPECTION: 'info',
  COMPLETED: 'success',
  REJECTED: 'error',
  CANCELED: 'error',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const isSubmittable = (status) => SUBMITTABLE_STATUSES.has(status)
const isEditable = (status) => EDITABLE_STATUSES.has(status)
const isCancellable = (status) => CANCELLABLE_STATUSES.has(status)

async function handleEditRequest(item) {
  submitError.value = ''
  editingId.value = item.id
  try {
    const detail = await getRequestById(item.id)
    editingRequest.value = detail?.data ?? item
    isEditRequestOpen.value = true
  } catch (err) {
    submitError.value = err?.message || `Failed to load request ${item.request_number}.`
  } finally {
    editingId.value = ''
  }
}

function handleRequestUpdated() {
  isEditRequestOpen.value = false
  fetchRequests(meta.page)
}

function handleViewRequest(item) {
  viewingRequestId.value = item.id
  isDetailOpen.value = true
}

function handleCancelRequest(item) {
  submitError.value = ''
  cancelingRequest.value = item
  isCancelRequestOpen.value = true
}

function handleRequestCanceled() {
  isCancelRequestOpen.value = false
  fetchRequests(meta.page)
}

async function handleSubmitRequest(item) {
  submitError.value = ''
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
