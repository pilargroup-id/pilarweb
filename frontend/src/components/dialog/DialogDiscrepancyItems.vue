<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
      >
        <div class="sidebar-gradient-bg relative shrink-0 rounded-t-3xl px-6 py-6 lg:px-8">
          <button
            @click="close"
            type="button"
            class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <CloseIcon class="h-5 w-5" />
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">{{ group?.request_number || 'Delivery Discrepancy' }}</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ group?.requester_name || '-' }}
            <span v-if="group?.department_name">&middot; {{ group.department_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-gray-200 pb-4 mb-5 text-theme-xs dark:border-gray-800">
            <div class="flex items-center gap-1.5">
              <dt class="text-gray-400 dark:text-gray-500">Items</dt>
              <dd class="font-medium text-gray-700 dark:text-gray-300">{{ group?.item_count ?? 0 }}</dd>
            </div>
            <div class="flex items-center gap-1.5">
              <dt class="text-gray-400 dark:text-gray-500">Status</dt>
              <dd><Badge :color="statusColor(group?.status)" size="sm">{{ formatStatusLabel(group?.status) }}</Badge></dd>
            </div>
            <div v-if="group?.resolution_due_at" class="flex items-center gap-1.5">
              <dt class="text-gray-400 dark:text-gray-500">Resolution Due</dt>
              <dd class="font-medium text-gray-700 dark:text-gray-300">{{ formatDateTime(group.resolution_due_at) }}</dd>
            </div>
          </div>

          <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <div class="overflow-x-auto custom-scrollbar">
              <table class="w-full min-w-[920px] divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fulfillment No</th>
                    <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Expected</th>
                    <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Received</th>
                    <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Difference</th>
                    <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Resolution Due</th>
                    <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-for="item in group?.items || []" :key="item.id">
                    <td class="px-4 py-3.5 align-top">
                      <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ item.item_name || '-' }}</span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ item.item_code || '-' }}</span>
                    </td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ item.fulfillment_number || '-' }}</td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top text-right text-theme-sm text-gray-600 dark:text-gray-300">{{ item.expected_qty }}</td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top text-right text-theme-sm text-gray-600 dark:text-gray-300">{{ item.received_qty }}</td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top text-right text-theme-sm font-medium text-warning-600 dark:text-warning-400">{{ item.difference_qty }}</td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top">
                      <Badge :color="statusColor(item.status)" size="sm">{{ formatStatusLabel(item.status) }}</Badge>
                      <p v-if="item.status === 'RESOLVED' && item.resolution_type" class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                        {{ formatStatusLabel(item.resolution_type) }}
                      </p>
                    </td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ formatDateTime(item.resolution_due_at) }}</td>
                    <td class="whitespace-nowrap px-4 py-3.5 align-top text-right">
                      <button
                        v-if="canResolve(item)"
                        @click="openResolveDialog(item)"
                        type="button"
                        title="Resolve"
                        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-theme-sm font-medium text-brand-500 shadow-theme-xs hover:bg-brand-50 dark:border-brand-800 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
                      >
                        <CheckIcon class="h-4 w-4" />
                        Resolve
                      </button>
                      <span v-else class="text-theme-xs text-gray-400 dark:text-gray-500">-</span>
                    </td>
                  </tr>
                  <tr v-if="!group?.items?.length">
                    <td colspan="8" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      No items on this discrepancy.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <DialogResolveDiscrepancy
    :is-open="isResolveDialogOpen"
    :discrepancy-item="discrepancyToResolve"
    @close="isResolveDialogOpen = false"
    @resolved="handleResolved"
  />
</template>

<script setup>
import { ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import DialogResolveDiscrepancy from '@/components/dialog/DialogResolveDiscrepancy.vue'
import { authState } from '@/service/auth'
import { CheckIcon, CloseIcon } from '@/icons'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  group: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'resolved'])

const isResolveDialogOpen = ref(false)
const discrepancyToResolve = ref(null)

// Section 12/25: once the SLA reaches SUPERVISOR_REQUIRED, only a user with
// WAREHOUSE_DISCREPANCY_SUPERVISOR access may resolve it.
function canResolve(item) {
  if (item.status === 'RESOLVED') return false
  if (item.status === 'SUPERVISOR_REQUIRED') {
    return Boolean(authState.capabilities?.warehouse_discrepancy_supervisor_access)
  }
  return true
}

function openResolveDialog(item) {
  discrepancyToResolve.value = item
  isResolveDialogOpen.value = true
}

function handleResolved() {
  isResolveDialogOpen.value = false
  emit('resolved')
}

const STATUS_BADGE_COLOR = {
  OPEN: 'light',
  OVERDUE: 'warning',
  ESCALATED: 'warning',
  SUPERVISOR_REQUIRED: 'error',
  RESOLVED: 'success',
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

function close() {
  if (isResolveDialogOpen.value) return
  emit('close')
}
</script>
