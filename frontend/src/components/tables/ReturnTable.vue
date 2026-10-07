<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Returns</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Requester returns awaiting receipt and inspection by Warehouse.
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
        <TableHeadCell>Return No</TableHeadCell>
        <TableHeadCell>Request No</TableHeadCell>
        <TableHeadCell>Requester</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading returns...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!queue.length">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No returns have been submitted yet.</p>
        </td>
      </tr>
      <tr
        v-for="item in queue"
        v-else
        :key="item.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <button
            v-if="item.status === 'SUBMITTED'"
            @click="openReceiveDialog(item)"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
          >
            <CheckIcon class="h-4 w-4" />
            Receive
          </button>
          <button
            v-else-if="item.status === 'RECEIVED'"
            @click="openInspectDialog(item)"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
          >
            <CheckIcon class="h-4 w-4" />
            Inspect
          </button>
          <span v-else class="text-gray-400 text-theme-sm dark:text-gray-600">-</span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ item.return_number }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.request_number || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.requester_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.department_name || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDate(item.returned_at || item.created_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.status)" size="sm">{{ formatStatusLabel(item.status) }}</Badge>
        </td>
      </tr>

      <template #pagination>
        <TablePagination
          :page="meta.page"
          :limit="meta.limit"
          :total="meta.total"
          :total-pages="meta.totalPages"
          :disabled="isLoading"
          item-label="returns"
          @update:page="fetchQueue"
        />
      </template>
    </BaseTable>

    <DialogReceiveReturn
      :is-open="isReceiveDialogOpen"
      :return-item="returnToProcess"
      @close="closeReceiveDialog"
      @received="handleChanged"
    />

    <DialogInspectReturn
      :is-open="isInspectDialogOpen"
      :return-item="returnToProcess"
      @close="closeInspectDialog"
      @inspected="handleChanged"
    />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getReturns } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogReceiveReturn from '@/components/dialog/DialogReceiveReturn.vue'
import DialogInspectReturn from '@/components/dialog/DialogInspectReturn.vue'
import { RefreshIcon, CheckIcon } from '@/icons'

const queue = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const isReceiveDialogOpen = ref(false)
const isInspectDialogOpen = ref(false)
const returnToProcess = ref(null)

function openReceiveDialog(item) {
  returnToProcess.value = item
  isReceiveDialogOpen.value = true
}

function closeReceiveDialog() {
  isReceiveDialogOpen.value = false
  returnToProcess.value = null
}

function openInspectDialog(item) {
  returnToProcess.value = item
  isInspectDialogOpen.value = true
}

function closeInspectDialog() {
  isInspectDialogOpen.value = false
  returnToProcess.value = null
}

async function handleChanged() {
  await fetchQueue(meta.page)
}

// Section 13: a return's own lifecycle is SUBMITTED -> RECEIVED -> COMPLETED,
// separate from the parent request's RETURN_PENDING / PARTIALLY_RETURNED status.
const STATUS_BADGE_COLOR = {
  SUBMITTED: 'warning',
  RECEIVED: 'info',
  COMPLETED: 'success',
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

async function fetchQueue(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getReturns({ page, limit: meta.limit })
    queue.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? queue.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    queue.value = []
    errorMessage.value = err?.message || 'Failed to load returns.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchQueue(1))

defineExpose({ refresh: fetchQueue })
</script>
