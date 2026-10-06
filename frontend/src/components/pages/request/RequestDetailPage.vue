<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <ComponentCard>
        <div v-if="isLoading" class="py-6 text-center">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading request...</p>
        </div>
        <div v-else-if="loadError" class="py-6 text-center">
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
        </div>
      </ComponentCard>

      <ComponentCard v-if="requestDetail" title="Items">
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
      </ComponentCard>

      <ComponentCard v-if="requestDetail?.fulfillments?.length" title="Fulfillment &amp; Handover">
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
      </ComponentCard>

      <ComponentCard v-if="requestDetail?.requires_return" title="Returns">
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
      </ComponentCard>
    </div>

    <DialogSubmitReturn
      :is-open="isSubmitReturnDialogOpen"
      :request="requestDetail"
      @close="isSubmitReturnDialogOpen = false"
      @submitted="loadRequest"
    />
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import DialogSubmitReturn from '@/components/dialog/DialogSubmitReturn.vue'
import { CheckIcon } from '@/icons'
import { getRequestById, receiveHandover } from '@/service/api'

const route = useRoute()
const currentPageTitle = ref('Request Detail')

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

// Section 13: same issued-minus-returned balance DialogSubmitReturn.vue
// computes, used here only to decide whether the Submit Return action shows.
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

async function loadRequest() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await getRequestById(route.params.id)
    requestDetail.value = res?.data ?? null
    if (requestDetail.value?.request_number) {
      currentPageTitle.value = requestDetail.value.request_number
    }
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
  } catch (err) {
    receiveError.value = err?.message || 'Failed to confirm receipt.'
  } finally {
    receivingId.value = ''
  }
}

onMounted(loadRequest)
</script>
