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

            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Reason</dt>
                <dd class="text-theme-sm text-gray-800 dark:text-white/90">{{ requestDetail.reason || '-' }}</dd>
              </div>
              <div v-if="requestDetail.requires_return">
                <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Return Due Date</dt>
                <dd class="text-theme-sm text-gray-800 dark:text-white/90">{{ formatDate(requestDetail.return_due_date) }}</dd>
              </div>
              <div>
                <dt class="text-theme-xs text-gray-500 dark:text-gray-400">Submitted</dt>
                <dd class="text-theme-sm text-gray-800 dark:text-white/90">{{ formatDate(requestDetail.submitted_at) }}</dd>
              </div>
            </dl>

            <div>
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Items</h5>
              <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Requested Qty</th>
                      <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr v-for="item in requestDetail.items" :key="item.id">
                      <td class="px-4 py-3 align-top">
                        <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ item.item_name }}</span>
                        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ item.item_code }}</span>
                      </td>
                      <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ item.requested_qty }}</td>
                      <td class="px-4 py-3 align-top">
                        <Badge :color="item.status === 'CANCELED' ? 'error' : 'light'" size="sm">{{ item.status }}</Badge>
                      </td>
                    </tr>
                    <tr v-if="!requestDetail.items?.length">
                      <td colspan="3" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
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

                    <div v-if="fulfillment.handover.status === 'HANDED_OVER'" class="mt-3 flex justify-end">
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

            <div v-if="requestDetail.requires_return">
              <h5 class="mb-3 text-theme-sm font-medium text-gray-700 dark:text-gray-300">Returns</h5>
              <div class="flex flex-col gap-5">
                <div v-if="returnBalance > 0" class="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-500/5">
                  <p class="text-theme-sm text-gray-600 dark:text-gray-300">
                    {{ returnBalance }} unit(s) are still eligible to be returned.
                  </p>
                  <button
                    @click="isSubmitReturnDialogOpen = true"
                    type="button"
                    class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600"
                  >
                    Submit Return
                  </button>
                </div>

                <div v-if="!requestDetail.returns?.length" class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No returns have been submitted yet.
                </div>
                <div
                  v-for="ret in requestDetail.returns"
                  :key="ret.id"
                  v-else
                  class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ ret.return_number }}</span>
                    <Badge :color="statusColor(ret.status)" size="sm">{{ formatStatusLabel(ret.status) }}</Badge>
                  </div>
                  <p class="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
                    Submitted {{ formatDate(ret.returned_at) }}
                    <span v-if="ret.note"> &middot; {{ ret.note }}</span>
                  </p>
                  <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead class="bg-gray-50 dark:bg-white/[0.02]">
                        <tr>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Returned Qty</th>
                          <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Condition</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr v-for="ri in ret.items" :key="ri.id">
                          <td class="px-4 py-3 align-top">
                            <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ ri.item_name }}</span>
                            <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ ri.item_code }}</span>
                          </td>
                          <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ ri.returned_qty }}</td>
                          <td class="px-4 py-3 align-top">
                            <Badge v-if="ri.condition_code !== 'PENDING'" :color="ri.condition_code === 'GOOD' ? 'success' : 'error'" size="sm">
                              {{ ri.condition_code }}
                            </Badge>
                            <span v-else class="text-gray-400 text-theme-sm dark:text-gray-600">Awaiting inspection</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>

  <DialogSubmitReturn
    :is-open="isSubmitReturnDialogOpen"
    :request="requestDetail"
    @close="isSubmitReturnDialogOpen = false"
    @submitted="loadRequest"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import DialogSubmitReturn from '@/components/dialog/DialogSubmitReturn.vue'
import { CheckIcon } from '@/icons'
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
  PARTIALLY_RETURNED: 'warning',
  RETURNED: 'info',
  RETURN_INSPECTION: 'info',
  COMPLETED: 'success',
  RECEIVED: 'success',
  REJECTED: 'error',
  CANCELED: 'error',
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

const returnBalance = computed(() => {
  if (!requestDetail.value) return 0
  const issuedByItem = new Map()
  for (const fulfillment of requestDetail.value.fulfillments || []) {
    if (fulfillment.handover?.status !== 'RECEIVED') continue
    for (const fi of fulfillment.items || []) {
      const id = Number(fi.request_item_id)
      issuedByItem.set(id, (issuedByItem.get(id) || 0) + Number(fi.actual_qty || 0))
    }
  }
  const usedByItem = new Map()
  for (const ret of requestDetail.value.returns || []) {
    for (const ri of ret.items || []) {
      const id = Number(ri.request_item_id)
      usedByItem.set(id, (usedByItem.get(id) || 0) + Number(ri.returned_qty || 0))
    }
  }
  let total = 0
  for (const [id, issued] of issuedByItem) {
    total += Math.max(0, issued - (usedByItem.get(id) || 0))
  }
  return Math.round(total * 100) / 100
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
