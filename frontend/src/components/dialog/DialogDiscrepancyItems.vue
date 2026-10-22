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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">
            {{ form?.request_number || group?.request_number || 'Delivery Discrepancy' }}
          </h4>
          <p class="pr-12 text-sm text-white/70">
            {{ form?.requester_name || group?.requester_name || '-' }}
            <span v-if="form?.department_name || group?.department_name">
              &middot; {{ form?.department_name || group?.department_name }}
            </span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <p v-if="isLoading" class="py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            Loading discrepancy form...
          </p>
          <p v-else-if="loadError" class="py-10 text-center text-theme-sm text-error-600 dark:text-error-500">
            {{ loadError }}
          </p>
          <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
            <p class="text-theme-sm text-gray-500 dark:text-gray-400">
              All rows marked <span class="font-medium text-gray-700 dark:text-gray-300">Resend</span> in this form
              are grouped into one supplemental fulfillment. Submit a resolution for every row below — partial
              submission is rejected.
            </p>

            <div
              v-if="needsSupervisor && !hasSupervisorAccess"
              class="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400"
            >
              This form has an overdue row that requires Warehouse supervisor access to resolve.
            </div>

            <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full min-w-[960px] divide-y divide-gray-200 dark:divide-gray-800">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                      <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fulfillment No</th>
                      <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Expected</th>
                      <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Received</th>
                      <th class="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400">Difference</th>
                      <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th class="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Resolution</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <template v-for="item in form?.items || []" :key="item.id">
                      <tr>
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
                        </td>
                        <td class="px-4 py-3.5 align-top">
                          <div class="flex flex-col gap-1.5">
                            <label class="inline-flex items-center gap-1.5 text-theme-sm text-gray-700 dark:text-gray-300">
                              <input v-model="itemState[item.id].resolution_type" type="radio" value="RESEND" />
                              Resend
                            </label>
                            <label class="inline-flex items-center gap-1.5 text-theme-sm text-gray-700 dark:text-gray-300">
                              <input v-model="itemState[item.id].resolution_type" type="radio" value="CLOSE_WITH_REASON" />
                              Close with Reason
                            </label>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="itemState[item.id].resolution_type === 'CLOSE_WITH_REASON'">
                        <td colspan="7" class="bg-gray-50 px-4 py-3.5 dark:bg-white/[0.02]">
                          <label class="mb-1.5 block text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                            Resolution Note <span class="text-error-500">*</span>
                          </label>
                          <textarea
                            v-model="itemState[item.id].resolution_note"
                            rows="2"
                            placeholder="Required: explain why the remaining qty will not be sent"
                            class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                          ></textarea>
                        </td>
                      </tr>
                    </template>
                    <tr v-if="!form?.items?.length">
                      <td colspan="7" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        No items on this discrepancy.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="hasOverdueItems">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Late Resolution Reason
                <span class="text-error-500">*</span>
              </label>
              <textarea
                v-model="lateResolutionReason"
                rows="2"
                placeholder="Required: explain why the overdue row(s) above are being resolved after the SLA deadline"
                class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              ></textarea>
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="close"
                type="button"
                :disabled="isSubmitting"
                class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || (needsSupervisor && !hasSupervisorAccess)"
                class="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckIcon class="h-4 w-4" />
                {{ isSubmitting ? 'Submitting...' : 'Submit Resolution' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import { authState } from '@/service/auth'
import { CheckIcon, CloseIcon } from '@/icons'
import { getWarehouseDiscrepancyForm, resolveWarehouseDiscrepancyForm } from '@/service/api'

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

const form = ref(null)
const itemState = reactive({})
const lateResolutionReason = ref('')
const isLoading = ref(false)
const loadError = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

// Section 12/25: once the SLA reaches SUPERVISOR_REQUIRED, only a user with
// WAREHOUSE_DISCREPANCY_SUPERVISOR access may submit this form's resolution.
const needsSupervisor = computed(() => (form.value?.items || []).some((item) => item.status === 'SUPERVISOR_REQUIRED'))
const hasSupervisorAccess = computed(() => Boolean(authState.capabilities?.warehouse_discrepancy_supervisor_access))

const hasOverdueItems = computed(() =>
  (form.value?.items || []).some((item) => ['OVERDUE', 'ESCALATED', 'SUPERVISOR_REQUIRED'].includes(item.status)),
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) loadForm()
  }
)

async function loadForm() {
  form.value = null
  Object.keys(itemState).forEach((key) => delete itemState[key])
  lateResolutionReason.value = ''
  errorMessage.value = ''
  loadError.value = ''
  isLoading.value = true
  try {
    const res = await getWarehouseDiscrepancyForm(props.group.request_id)
    form.value = res?.data ?? null
    for (const item of form.value?.items || []) {
      itemState[item.id] = { resolution_type: '', resolution_note: '' }
    }
  } catch (err) {
    loadError.value = err?.message || 'Failed to load the delivery discrepancy form.'
  } finally {
    isLoading.value = false
  }
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

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  if (!form.value) return

  const items = form.value.items || []
  for (const item of items) {
    if (!itemState[item.id]?.resolution_type) {
      errorMessage.value = 'Choose a resolution for every row before submitting.'
      return
    }
  }
  for (const item of items) {
    const state = itemState[item.id]
    if (state.resolution_type === 'CLOSE_WITH_REASON' && !state.resolution_note.trim()) {
      errorMessage.value = `Resolution note is required for "${item.item_name || item.id}" (Close with Reason).`
      return
    }
  }
  const lateReason = lateResolutionReason.value.trim()
  if (hasOverdueItems.value && !lateReason) {
    errorMessage.value = 'Late resolution reason is required because this form has an overdue row.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await resolveWarehouseDiscrepancyForm(form.value.id, {
      items: items.map((item) => ({
        discrepancy_id: item.id,
        resolution_type: itemState[item.id].resolution_type,
        resolution_note: itemState[item.id].resolution_note.trim() || null,
      })),
      late_resolution_reason: lateReason || null,
    })
    emit('resolved')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to submit the delivery discrepancy form.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
