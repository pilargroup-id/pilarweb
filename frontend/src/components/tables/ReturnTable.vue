<template>
  <div class="space-y-5">
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
            placeholder="Search return no, request no, or requester..."
            class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
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
import { reactive, ref, onMounted, onUnmounted } from 'vue'
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
const search = ref('')
let searchTimer = null
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
    const res = await getReturns({
      page,
      limit: meta.limit,
      ...(search.value ? { search: search.value } : {}),
    })
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

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchQueue(1), 400)
}

onMounted(() => fetchQueue(1))
onUnmounted(() => clearTimeout(searchTimer))

defineExpose({ refresh: fetchQueue })
</script>
