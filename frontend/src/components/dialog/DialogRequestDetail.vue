<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
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
            {{ requestDetail?.request_number || 'Request Detail' }}
          </h4>
          <p class="pr-12 text-sm text-white/70">
            {{ requestDetail?.request_purpose_name || '-' }}
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading request...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <div v-else-if="requestDetail" class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {{ requestDetail.request_number }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ requestDetail.request_purpose_name || '-' }}</p>
              </div>
              <Badge :color="statusColor(requestDetail.status)" size="md">{{ formatStatusLabel(requestDetail.status) }}</Badge>
            </div>

            <div class="flex flex-col gap-2 border-b border-gray-200 pb-4 dark:border-gray-800">
              <dl class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-theme-xs">
                <div class="flex items-center gap-1.5">
                  <dt class="text-gray-400 dark:text-gray-500">Submitted</dt>
                  <dd class="font-medium text-gray-700 dark:text-gray-300">{{ submittedDateLabel }}</dd>
                </div>
                <div v-if="isReturnable" class="flex items-center gap-1.5">
                  <dt class="text-gray-400 dark:text-gray-500">Return Due</dt>
                  <dd class="font-medium text-gray-700 dark:text-gray-300">{{ formatDate(requestDetail.return_due_date) }}</dd>
                </div>
              </dl>
              <p class="whitespace-pre-line break-words text-theme-sm text-gray-600 dark:text-gray-300">
                {{ requestDetail.reason || '-' }}
              </p>
            </div>

            <div>
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Items</h5>
              <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Requested Qty</th>
                      <template v-if="hasFinanceReview">
                        <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Approved Qty</th>
                        <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reject Qty</th>
                      </template>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Note</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr v-for="item in requestDetail.items" :key="item.id">
                      <td class="px-4 py-3 align-top">
                        <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ item.item_name }}</span>
                        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ item.item_code }}</span>
                      </td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ item.requested_qty }}</td>
                      <template v-if="hasFinanceReview">
                        <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">
                          {{ financeItemFor(item)?.approved_qty ?? '-' }}
                        </td>
                        <td class="px-4 py-3 align-top text-theme-sm" :class="rejectQtyClass(financeItemFor(item)?.rejected_qty)">
                          {{ financeItemFor(item)?.rejected_qty ?? '-' }}
                        </td>
                      </template>
                      <td class="px-4 py-3 align-top text-theme-xs text-gray-500 dark:text-gray-400">
                        {{ itemNote(item) || '-' }}
                      </td>
                    </tr>
                    <tr v-if="!requestDetail.items?.length">
                      <td :colspan="hasFinanceReview ? 5 : 3" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        No items on this request.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="requestDetail.fulfillments?.length">
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Fulfillment &amp; Handover</h5>
              <div class="flex flex-col gap-5">
                <div
                  v-for="fulfillment in requestDetail.fulfillments"
                  :key="fulfillment.id"
                  class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {{ fulfillment.fulfillment_number }}
                    </span>
                    <Badge :color="statusColor(fulfillment.status)" size="sm">{{ formatStatusLabel(fulfillment.status) }}</Badge>
                  </div>

                  <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead class="bg-gray-50 dark:bg-white/[0.02]">
                        <tr>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Approved Qty</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actual Qty</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Shortage</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr v-for="fi in fulfillment.items" :key="fi.id">
                          <td class="px-4 py-3 align-top">
                            <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ fi.item_name }}</span>
                            <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ fi.item_code }}</span>
                          </td>
                          <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ fi.finance_approved_qty_snapshot }}</td>
                          <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ fi.actual_qty }}</td>
                          <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ fi.shortage_qty }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div v-if="fulfillment.handover" class="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.02]">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-theme-sm text-gray-600 dark:text-gray-300">
                        Handed over {{ formatDate(fulfillment.handover.handed_over_at) }}
                        <span v-if="fulfillment.handover.received_at"> &middot; Received {{ formatDate(fulfillment.handover.received_at) }}</span>
                      </p>
                      <Badge :color="fulfillment.handover.status === 'RECEIVED' ? 'success' : 'warning'" size="sm">
                        {{ formatStatusLabel(fulfillment.handover.status) }}
                      </Badge>
                    </div>
                    <p v-if="fulfillment.handover.note" class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                      {{ fulfillment.handover.note }}
                    </p>

                    <div v-if="!readOnly && fulfillment.handover.status === 'HANDED_OVER'" class="mt-3 flex justify-end">
                      <button
                        @click="handleReceive(fulfillment.handover)"
                        type="button"
                        :disabled="receivingId === fulfillment.handover.id"
                        class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckIcon class="h-4 w-4" />
                        {{ receivingId === fulfillment.handover.id ? 'Confirming...' : 'Confirm Receipt' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p v-if="receiveError" class="mt-3 text-sm text-error-600 dark:text-error-500">{{ receiveError }}</p>
            </div>

            <div v-if="isReturnable">
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Returns</h5>
              <div v-if="!requestDetail.return" class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No return obligation yet. It is created automatically once goods are handed over.
              </div>
              <div v-else class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ requestDetail.return.return_number }}</span>
                  <Badge :color="statusColor(requestDetail.return.status)" size="sm">{{ formatStatusLabel(requestDetail.return.status) }}</Badge>
                </div>
                <p class="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
                  Due {{ formatDate(requestDetail.return.due_date) }}
                  <span v-if="requestDetail.return.requester_submitted_at"> &middot; Submitted {{ formatDate(requestDetail.return.requester_submitted_at) }}</span>
                </p>

                <div
                  v-if="!readOnly && requestDetail.return.status === 'PENDING_REQUESTER'"
                  class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-500/5"
                >
                  <p class="text-theme-sm text-gray-600 dark:text-gray-300">
                    This return is awaiting your declaration.
                  </p>
                  <button
                    @click="isSubmitReturnDialogOpen = true"
                    type="button"
                    class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600"
                  >
                    Submit Return
                  </button>
                </div>

                <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead class="bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                        <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Expected Qty</th>
                        <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Declared Qty</th>
                        <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Warehouse Received</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr v-for="ri in requestDetail.return.items" :key="ri.id">
                        <td class="px-4 py-3 align-top">
                          <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ ri.item_name }}</span>
                          <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ ri.item_code }}</span>
                        </td>
                        <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ ri.expected_qty }}</td>
                        <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ ri.requester_return_qty ?? '-' }}</td>
                        <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ ri.warehouse_received_qty }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
                      <CloseIcon v-else-if="step.status === 'rejected'" class="h-4 w-4" />
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

  <DialogSubmitReturn
    :is-open="isSubmitReturnDialogOpen"
    :return-data="requestDetail?.return"
    :request-number="requestDetail?.request_number"
    @close="isSubmitReturnDialogOpen = false"
    @submitted="handleReturnSubmitted"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import DialogSubmitReturn from '@/components/dialog/DialogSubmitReturn.vue'
import { CheckIcon, CloseIcon } from '@/icons'
import { getRequestById, receiveHandover } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  requestId: {
    type: [String, Number],
    default: null,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'changed'])

const isLoading = ref(false)
const loadError = ref('')
const requestDetail = ref(null)
const receivingId = ref('')
const receiveError = ref('')
const isSubmitReturnDialogOpen = ref(false)

const STATUS_BADGE_COLOR = {
  DRAFT: 'light',
  SUBMITTED: 'warning',
  REVERTED_TO_REQUESTER: 'warning',
  PENDING_DEPARTMENT_APPROVAL: 'warning',
  PENDING_FINANCE_REVIEW: 'warning',
  READY_FOR_WAREHOUSE: 'info',
  PICKING: 'info',
  PENDING_INVENTORY_TRANSFER: 'info',
  READY_FOR_HANDOVER: 'info',
  HANDED_OVER: 'primary',
  PARTIALLY_FULFILLED: 'warning',
  RETURN_PENDING: 'warning',
  RETURN_SUBMITTED: 'info',
  RETURN_PARTIAL: 'warning',
  PENDING_REQUESTER: 'light',
  PARTIALLY_RECEIVED: 'warning',
  COMPLETED: 'success',
  RECEIVED: 'success',
  REJECTED: 'error',
  CANCELED: 'error',
}

const statusColor = (status) => STATUS_BADGE_COLOR[status] || 'light'

const TIMELINE_STEP_COLOR = {
  done: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  rejected: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  pending: 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500',
}

const timelineStepColor = (status) => TIMELINE_STEP_COLOR[status] || TIMELINE_STEP_COLOR.pending

const TIMELINE_BADGE_COLOR = {
  done: 'success',
  rejected: 'error',
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

const submittedDateLabel = computed(() => {
  if (!requestDetail.value?.submitted_at) return 'Not submitted yet'
  return formatDate(requestDetail.value.submitted_at)
})

const hasFinanceReview = computed(() => !!requestDetail.value?.finance_review?.reviewed_at)

const financeItemByRequestItemId = computed(() => {
  const map = new Map()
  for (const fi of requestDetail.value?.finance_review?.items || []) {
    map.set(Number(fi.request_item_id), fi)
  }
  return map
})

function financeItemFor(item) {
  return financeItemByRequestItemId.value.get(Number(item.id))
}

function itemNote(item) {
  return financeItemFor(item)?.note || item.notes || ''
}

const rejectQtyClass = (value) => {
  const num = Number(value ?? 0)
  return num > 0
    ? 'font-medium text-error-600 dark:text-error-500'
    : 'text-gray-600 dark:text-gray-300'
}

const isReturnable = computed(() => requestDetail.value?.purpose_return_type === 'RETURNABLE')

const timelineSteps = computed(() => {
  const req = requestDetail.value
  if (!req) return []
  const steps = []

  steps.push({
    key: 'submitted',
    title: 'Request Submitted',
    status: 'done',
    badge: 'Submitted',
    by: req.requester_name,
    at: req.submitted_at,
  })

  for (const approval of req.approvals || []) {
    const isApproved = approval.status === 'APPROVED'
    const isReverted = approval.status === 'REVERTED' || approval.status === 'CANCELED'
    steps.push({
      key: `approval-${approval.id}`,
      title: `Approved by ${approval.department_name || `Level ${approval.approval_order}`}`,
      status: isApproved ? 'done' : isReverted ? 'rejected' : 'pending',
      badge: isApproved ? 'Approved' : approval.status === 'CANCELED' ? 'Canceled' : isReverted ? 'Reverted' : 'Pending',
      extra: approval.required_job_level_name ? `Requires ${approval.required_job_level_name} or above` : null,
      by: isApproved ? approval.approver_name : isReverted ? approval.reverted_by_name : null,
      at: isApproved ? approval.decided_at : isReverted ? (approval.reverted_at || approval.decided_at) : null,
      pendingLabel: 'Awaiting approval',
      note: approval.note || approval.revert_reason,
    })
  }

  if (req.finance_review) {
    const fr = req.finance_review
    steps.push({
      key: 'finance',
      title: 'Reviewed by Finance',
      status: fr.status === 'APPROVED' ? 'done' : fr.status === 'REJECTED' ? 'rejected' : 'pending',
      badge: fr.status === 'APPROVED' ? 'Approved' : fr.status === 'REJECTED' ? 'Rejected' : 'Pending',
      by: fr.reviewer_name,
      at: fr.reviewed_at,
      pendingLabel: 'Awaiting Finance review',
      note: fr.note,
    })
  }

  if (req.fulfillment) {
    const f = req.fulfillment
    steps.push({
      key: 'picking',
      title: 'Picked by Warehouse',
      status: f.picking_completed_at ? 'done' : 'pending',
      badge: f.picking_completed_at ? 'Completed' : 'In Progress',
      extra: f.inventory_transfer_number ? `IWT ${f.inventory_transfer_number}` : null,
      by: f.picking_completed_by_name || f.created_by_name,
      at: f.picking_completed_at,
      pendingLabel: 'Picking in progress',
    })

    if (f.handover) {
      steps.push({
        key: 'handover',
        title: 'Handed Over',
        status: 'done',
        badge: 'Handed Over',
        by: f.handover.handed_over_by_name,
        at: f.handover.handed_over_at,
        note: f.handover.note,
      })
    }
  }

  if (isReturnable.value && req.return) {
    const ret = req.return
    steps.push({
      key: 'return-submitted',
      title: 'Return Submitted',
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
        by: receipt.received_by_name,
        at: receipt.received_at,
        note: receipt.note,
      })
    }
  }

  if (req.completed_at) {
    steps.push({
      key: 'completed',
      title: 'Completed',
      status: 'done',
      badge: 'Completed',
      at: req.completed_at,
    })
  }

  return steps.reverse()
})

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.requestId) {
      loadRequest()
    } else if (!open) {
      requestDetail.value = null
      loadError.value = ''
      receiveError.value = ''
      isSubmitReturnDialogOpen.value = false
    }
  }
)

async function loadRequest() {
  if (!props.requestId) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await getRequestById(props.requestId)
    requestDetail.value = res?.data ?? null
  } catch (err) {
    requestDetail.value = null
    loadError.value = err?.message || 'Failed to load request.'
  } finally {
    isLoading.value = false
  }
}

async function handleReturnSubmitted() {
  await loadRequest()
  emit('changed')
}

async function handleReceive(handover) {
  receiveError.value = ''
  receivingId.value = handover.id
  try {
    await receiveHandover(handover.id)
    await loadRequest()
    emit('changed')
  } catch (err) {
    receiveError.value = err?.message || 'Failed to confirm receipt.'
  } finally {
    receivingId.value = ''
  }
}

function close() {
  emit('close')
}
</script>
