<template>
  <div class="space-y-5">
    <Alert
      v-if="createdNotice"
      variant="success"
      title="Request created"
      :message="`Request ${createdNotice} was saved as a draft. Click Submit for Approval when it's ready.`"
    />

    <Alert
      v-if="submitError"
      variant="error"
      title="Submit failed"
      :message="submitError"
    />

    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">My Requests</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Requests you have submitted to Warehouse.</p>
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
        <TableHeadCell>Request No</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        <TableHeadCell>Return Due Date</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Action</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading requests...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!requests.length">
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
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
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ item.request_number }}
          </span>
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
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <div class="flex items-center gap-2">
            <router-link
              :to="`/request/${item.id}`"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              View
            </router-link>
            <button
              v-if="isSubmittable(item.status)"
              @click="handleSubmitRequest(item)"
              :disabled="submittingId === item.id"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              {{ submittingId === item.id ? 'Submitting...' : 'Submit for Approval' }}
            </button>
          </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getMyRequests, submitRequest } from '@/service/api'
import Alert from '@/components/ui/Alert.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogNewRequest from '@/components/dialog/DialogNewRequest.vue'
import { PlusIcon, RefreshIcon } from '@/icons'

const route = useRoute()
const createdNotice = ref(typeof route.query.created === 'string' ? route.query.created : '')
const isNewRequestOpen = ref(false)

const requests = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const submitError = ref('')
const submittingId = ref('')
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const SUBMITTABLE_STATUSES = new Set(['DRAFT', 'REVERTED_TO_REQUESTER'])

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
  fetchRequests(1)
}

async function fetchRequests(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getMyRequests({ page, limit: meta.limit })
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

onMounted(() => fetchRequests(1))
</script>
