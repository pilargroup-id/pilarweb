<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Pending Approvals</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Requests awaiting your department approval.</p>
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
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading approvals...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!approvals.length">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No pending approvals.</p>
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
              @click="openDecision(item, 'approve')"
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-success-300 bg-white px-3 py-2 text-theme-sm font-medium text-success-600 shadow-theme-xs hover:bg-success-50 dark:border-success-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              Approve
            </button>
            <button
              @click="openDecision(item, 'reject')"
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-error-300 bg-white px-3 py-2 text-theme-sm font-medium text-error-600 shadow-theme-xs hover:bg-error-50 dark:border-error-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
            >
              Reject
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
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.request_purpose_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.submitted_at) }}</p>
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
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getApprovals } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogApprovalDecision from '@/components/dialog/DialogApprovalDecision.vue'
import { RefreshIcon } from '@/icons'

const approvals = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isDecisionOpen = ref(false)
const selectedApproval = ref(null)
const decisionMode = ref('approve')

function openDecision(item, mode) {
  selectedApproval.value = item
  decisionMode.value = mode
  isDecisionOpen.value = true
}

function handleDecided() {
  fetchApprovals(meta.page)
}

const STATUS_BADGE_COLOR = {
  PENDING_DEPARTMENT_APPROVAL: 'warning',
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

async function fetchApprovals(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getApprovals({ page, limit: meta.limit })
    approvals.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? approvals.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    approvals.value = []
    errorMessage.value = err?.message || 'Failed to load approvals.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchApprovals(1))
</script>
