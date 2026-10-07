<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Finance Review Queue</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Requests awaiting Finance decision before Warehouse fulfillment.
          </p>
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
        <TableHeadCell>Requester</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Reject Qty</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading finance queue...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!queue.length">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No requests pending Finance review.</p>
        </td>
      </tr>
      <tr
        v-for="item in queue"
        v-else
        :key="item.finance_review_id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <button
            @click="openReview(item)"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
          >
            <FileCheckIcon class="h-4 w-4" />
            Review
          </button>
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
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.request_purpose_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.submitted_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p :class="rejectQtyClass(item.total_rejected_qty)">{{ formatQty(item.total_rejected_qty) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.request_status)" size="sm">{{ formatStatusLabel(item.request_status) }}</Badge>
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
          @update:page="fetchQueue"
        />
      </template>
    </BaseTable>

    <DialogFinanceReview
      :is-open="isReviewOpen"
      :queue-item="selectedItem"
      @close="isReviewOpen = false"
      @reviewed="handleReviewed"
    />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getFinanceRequests } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogFinanceReview from '@/components/dialog/DialogFinanceReview.vue'
import { RefreshIcon, FileCheckIcon } from '@/icons'

const queue = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isReviewOpen = ref(false)
const selectedItem = ref(null)

function openReview(item) {
  selectedItem.value = item
  isReviewOpen.value = true
}

function handleReviewed() {
  fetchQueue(meta.page)
}

const STATUS_BADGE_COLOR = {
  PENDING_FINANCE_REVIEW: 'warning',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

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

async function fetchQueue(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getFinanceRequests({ page, limit: meta.limit })
    queue.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? queue.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    queue.value = []
    errorMessage.value = err?.message || 'Failed to load finance review queue.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchQueue(1))
</script>
