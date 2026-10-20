<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
      >
        <div class="sidebar-gradient-bg relative shrink-0 rounded-t-3xl px-6 py-6 lg:px-8">
          <button
            @click="close"
            type="button"
            class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <svg class="fill-current" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
                fill=""
              />
            </svg>
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">
            {{ returnDetail?.return_number || 'Return Detail' }}
          </h4>
          <p class="pr-12 text-sm text-white/70">
            {{ returnDetail?.request_number || '-' }}
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading return...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <div v-else-if="returnDetail" class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {{ returnDetail.return_number }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ returnDetail.request_purpose_name || '-' }}</p>
              </div>
              <Badge :color="statusColor(returnDetail.status)" size="md">{{ formatStatusLabel(returnDetail.status) }}</Badge>
            </div>

            <section class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div class="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Requester</dt>
                  <dd class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ returnDetail.requester_name || '-' }}</dd>
                </div>
                <div class="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Department</dt>
                  <dd class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ returnDetail.department_name || '-' }}</dd>
                </div>
                <div class="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Target Department</dt>
                  <dd class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ returnDetail.target_department_name || '-' }}</dd>
                </div>
                <div class="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Due Date</dt>
                  <dd class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ formatDate(returnDetail.due_date) }}</dd>
                </div>
                <div class="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Submitted</dt>
                  <dd class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {{ returnDetail.requester_submitted_at ? formatDate(returnDetail.requester_submitted_at) : 'Not submitted yet' }}
                  </dd>
                </div>
                <div class="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Completed</dt>
                  <dd class="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {{ returnDetail.completed_at ? formatDate(returnDetail.completed_at) : '-' }}
                  </dd>
                </div>
              </dl>
            </section>

            <div>
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Items</h5>
              <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Expected Qty</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Declared Qty</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Received Qty</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Outstanding</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Note</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr v-for="item in returnDetail.items" :key="item.id">
                      <td class="px-4 py-3 align-top">
                        <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ item.item_name }}</span>
                        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ item.item_code }}</span>
                      </td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ item.expected_qty }}</td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ item.requester_return_qty ?? '-' }}</td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ item.warehouse_received_qty ?? 0 }}</td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ outstandingQty(item) }}</td>
                      <td class="px-4 py-3 align-top text-theme-xs text-gray-500 dark:text-gray-400">{{ item.note || '-' }}</td>
                    </tr>
                    <tr v-if="!returnDetail.items?.length">
                      <td colspan="6" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        No items on this return.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="timelineSteps.length">
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Timeline</h5>
              <ol>
                <li
                  v-for="(step, idx) in timelineSteps"
                  :key="step.key"
                  class="relative flex gap-4"
                >
                  <div class="flex flex-col items-center">
                    <span
                      :class="[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        timelineStepColor(step.status),
                      ]"
                    >
                      <CheckIcon v-if="step.status === 'done'" class="h-4 w-4" />
                      <span v-else class="h-2 w-2 rounded-full bg-current"></span>
                    </span>
                    <span
                      v-if="idx < timelineSteps.length - 1"
                      class="my-1 w-px flex-1 bg-gray-200 dark:bg-gray-800"
                    ></span>
                  </div>
                  <div class="flex-1 pb-6">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ step.title }}</p>
                      <Badge :color="timelineBadgeColor(step.status)" size="sm">{{ step.badge }}</Badge>
                    </div>
                    <p v-if="step.extra" class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{{ step.extra }}</p>
                    <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                      <template v-if="step.by || step.at">
                        <span v-if="step.by" class="font-medium text-gray-700 dark:text-gray-300">{{ step.by }}</span>
                        <span v-if="step.by && step.at"> &middot; </span>
                        <span v-if="step.at">{{ formatDateTime(step.at) }}</span>
                      </template>
                      <template v-else>{{ step.pendingLabel || 'Awaiting action' }}</template>
                    </p>
                    <p v-if="step.note" class="mt-1 whitespace-pre-line break-words text-theme-xs text-gray-500 dark:text-gray-400">
                      Note: {{ step.note }}
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import { CheckIcon } from '@/icons'
import { getReturnById } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  returnId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['close'])

const isLoading = ref(false)
const loadError = ref('')
const returnDetail = ref(null)

const STATUS_BADGE_COLOR = {
  PENDING_REQUESTER: 'light',
  SUBMITTED: 'warning',
  PARTIALLY_RECEIVED: 'info',
  COMPLETED: 'success',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const TIMELINE_STEP_COLOR = {
  done: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  pending: 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500',
}

const timelineStepColor = (status) => TIMELINE_STEP_COLOR[status] || TIMELINE_STEP_COLOR.pending

const TIMELINE_BADGE_COLOR = {
  done: 'success',
  pending: 'warning',
}

const timelineBadgeColor = (status) => TIMELINE_BADGE_COLOR[status] || 'light'

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

const outstandingQty = (item) => {
  const outstanding = Math.max(0, Number(item.expected_qty || 0) - Number(item.warehouse_received_qty || 0))
  return Math.round(outstanding * 100) / 100
}

const receiptSummary = (receipt) => {
  const items = receipt.items || []
  if (!items.length) return ''
  return items.map((ri) => `${ri.received_qty}x ${ri.item_name}`).join(', ')
}

const timelineSteps = computed(() => {
  const ret = returnDetail.value
  if (!ret) return []
  const steps = []

  steps.push({
    key: 'created',
    title: 'Return Obligation Created',
    status: 'done',
    badge: 'Created',
    at: ret.created_at,
  })

  steps.push({
    key: 'submitted',
    title: 'Submitted by Requester',
    status: ret.requester_submitted_at ? 'done' : 'pending',
    badge: ret.requester_submitted_at ? 'Submitted' : 'Pending',
    by: ret.requester_submitted_by_name,
    at: ret.requester_submitted_at,
    pendingLabel: 'Awaiting requester declaration',
  })

  for (const receipt of ret.receipts || []) {
    steps.push({
      key: `receipt-${receipt.id}`,
      title: 'Received by Warehouse',
      status: 'done',
      badge: 'Received',
      extra: [receipt.receipt_number, receiptSummary(receipt)].filter(Boolean).join(' · '),
      by: receipt.received_by_name,
      at: receipt.received_at,
      note: receipt.note,
    })
  }

  steps.push({
    key: 'completed',
    title: 'Completed',
    status: ret.completed_at ? 'done' : 'pending',
    badge: ret.completed_at ? 'Completed' : 'Pending',
    at: ret.completed_at,
    pendingLabel: 'Awaiting full receipt by Warehouse',
  })

  return steps.reverse()
})

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.returnId) {
      loadReturn()
    } else if (!open) {
      returnDetail.value = null
      loadError.value = ''
    }
  }
)

async function loadReturn() {
  if (!props.returnId) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await getReturnById(props.returnId)
    returnDetail.value = res?.data ?? null
  } catch (err) {
    returnDetail.value = null
    loadError.value = err?.message || 'Failed to load return.'
  } finally {
    isLoading.value = false
  }
}

function close() {
  emit('close')
}
</script>
