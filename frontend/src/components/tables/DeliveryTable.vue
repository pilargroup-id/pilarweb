<template>
  <div class="space-y-5">
    <BaseTable max-height>
      <template #toolbar>
        <div class="flex w-full items-center gap-3 sm:max-w-[280px]">
          <div class="w-full">
            <SearchableSelect v-model="statusFilter" :options="statusFilterOptions" placeholder="Semua status" />
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
        <TableHeadCell>Purpose</TableHeadCell>
        <TableHeadCell>Fulfillment No</TableHeadCell>
        <TableHeadCell>Dispatched</TableHeadCell>
        <TableHeadCell>Confirmation Deadline</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Memuat data pengiriman...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!queue.length">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Tidak ada data pengiriman.</p>
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
            v-if="item.status === 'PENDING'"
            @click="openConfirmDialog(item)"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            <CheckIcon class="h-4 w-4" />
            Confirm Receipt
          </button>
          <span v-else class="text-theme-sm text-gray-400 dark:text-gray-500">-</span>
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
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.fulfillment_number || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatDateTime(item.dispatched_at) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p :class="deadlineClass(item)">{{ deadlineLabel(item) }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="statusColor(item.status)" size="sm">{{ formatStatusLabel(item.status) }}</Badge>
          <span v-if="item.confirmation_method === 'AUTO'" class="ml-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
            (diterima otomatis)
          </span>
        </td>
      </tr>

      <template #pagination>
        <TablePagination
          :page="meta.page"
          :limit="meta.limit"
          :total="meta.total"
          :total-pages="meta.totalPages"
          :disabled="isLoading"
          item-label="deliveries"
          @update:page="fetchQueue"
        />
      </template>
    </BaseTable>

    <DialogConfirmDelivery
      :is-open="isConfirmDialogOpen"
      :delivery-item="deliveryToConfirm"
      @close="closeConfirmDialog"
      @confirmed="handleConfirmed"
    />
  </div>
</template>

<script setup>
import { reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import { getMyDeliveries } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import TablePagination from '@/components/tables/TablePagination.vue'
import DialogConfirmDelivery from '@/components/dialog/DialogConfirmDelivery.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import { RefreshIcon, CheckIcon } from '@/icons'

const queue = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const meta = reactive({ page: 1, limit: 20, total: 0, totalPages: 1 })

const statusFilterOptions = [
  { id: '', name: 'Semua status' },
  { id: 'PENDING', name: 'Pending confirmation' },
  { id: 'PARTIAL', name: 'Partially received' },
  { id: 'RECEIVED', name: 'Received' },
]
const statusFilter = ref('')
watch(statusFilter, () => fetchQueue(1))

const isConfirmDialogOpen = ref(false)
const deliveryToConfirm = ref(null)

function openConfirmDialog(item) {
  deliveryToConfirm.value = item
  isConfirmDialogOpen.value = true
}

function closeConfirmDialog() {
  isConfirmDialogOpen.value = false
  deliveryToConfirm.value = null
}

async function handleConfirmed() {
  closeConfirmDialog()
  await fetchQueue(meta.page)
}

const STATUS_BADGE_COLOR = {
  PENDING: 'warning',
  PARTIAL: 'info',
  RECEIVED: 'success',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const formatStatusLabel = (status) => {
  if (!status) return '-'
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
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

// Ticks every minute so the deadline countdown stays live while the page is open.
const now = ref(Date.now())
let clockTimer = null

function deadlineLabel(item) {
  if (item.status !== 'PENDING' || !item.confirmation_deadline_at) return '-'
  const deadline = new Date(item.confirmation_deadline_at).getTime()
  if (Number.isNaN(deadline)) return '-'
  const diffMs = deadline - now.value
  if (diffMs <= 0) return 'Menunggu diterima otomatis...'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days} hari ${hours % 24} jam lagi`
  }
  return `${hours} jam ${minutes} menit lagi`
}

function deadlineClass(item) {
  if (item.status !== 'PENDING' || !item.confirmation_deadline_at) {
    return 'text-theme-sm text-gray-400 dark:text-gray-500'
  }
  const deadline = new Date(item.confirmation_deadline_at).getTime()
  const diffMs = deadline - now.value
  if (diffMs <= 1000 * 60 * 60 * 6) {
    return 'text-theme-sm font-medium text-error-600 dark:text-error-500'
  }
  return 'text-theme-sm text-gray-600 dark:text-gray-300'
}

async function fetchQueue(page = 1) {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getMyDeliveries({
      page,
      limit: meta.limit,
      ...(statusFilter.value ? { status: statusFilter.value } : {}),
    })
    queue.value = res?.data ?? []
    meta.page = res?.meta?.page ?? page
    meta.limit = res?.meta?.limit ?? meta.limit
    meta.total = res?.meta?.total ?? queue.value.length
    meta.totalPages = res?.meta?.totalPages ?? 1
  } catch (err) {
    queue.value = []
    errorMessage.value = err?.message || 'Gagal memuat data pengiriman.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchQueue(1)
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 60000)
})
onUnmounted(() => clearInterval(clockTimer))

defineExpose({ refresh: fetchQueue })
</script>
