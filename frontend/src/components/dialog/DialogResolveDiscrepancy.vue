<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Resolve Delivery Discrepancy</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ discrepancyItem?.request_number }}
            <span v-if="discrepancyItem?.item_name">&middot; {{ discrepancyItem.item_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <form class="flex flex-col gap-5" @submit.prevent="submit">
            <div class="grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <div>
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">Expected</p>
                <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ discrepancyItem?.expected_qty }}</p>
              </div>
              <div>
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">Received</p>
                <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ discrepancyItem?.received_qty }}</p>
              </div>
              <div>
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">Difference</p>
                <p class="text-theme-sm font-medium text-warning-600 dark:text-warning-400">{{ discrepancyItem?.difference_qty }}</p>
              </div>
            </div>

            <div
              v-if="isLate"
              class="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-700 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-400"
            >
              This discrepancy is overdue. A late resolution reason is required.
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Resolution</label>
              <div class="flex flex-col gap-2">
                <label
                  class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
                  :class="resolutionType === 'RESEND' ? 'border-brand-300 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-500/5' : ''"
                >
                  <input v-model="resolutionType" type="radio" value="RESEND" class="mt-0.5" />
                  <span>
                    <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">Resend</span>
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                      Warehouse will send the remaining quantity in a new supplemental shipment.
                    </span>
                  </span>
                </label>
                <label
                  class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
                  :class="resolutionType === 'CLOSE_WITH_REASON' ? 'border-brand-300 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-500/5' : ''"
                >
                  <input v-model="resolutionType" type="radio" value="CLOSE_WITH_REASON" class="mt-0.5" />
                  <span>
                    <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">Close with Reason</span>
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                      The remaining quantity will not be sent. The return obligation is reduced accordingly.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Resolution Note
                <span v-if="resolutionType === 'CLOSE_WITH_REASON'" class="text-error-500">*</span>
              </label>
              <textarea
                v-model="resolutionNote"
                rows="2"
                :placeholder="resolutionType === 'CLOSE_WITH_REASON' ? 'Required: explain why the remaining qty will not be sent' : 'Optional note'"
                class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              ></textarea>
            </div>

            <div v-if="isLate">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Late Resolution Reason
                <span class="text-error-500">*</span>
              </label>
              <textarea
                v-model="lateResolutionReason"
                rows="2"
                placeholder="Required: explain why this discrepancy was resolved after the SLA deadline"
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
                :disabled="isSubmitting"
                class="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckIcon class="h-4 w-4" />
                {{ isSubmitting ? 'Resolving...' : 'Resolve' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import { CheckIcon } from '@/icons'
import { resolveWarehouseDiscrepancy } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  discrepancyItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'resolved'])

const resolutionType = ref('RESEND')
const resolutionNote = ref('')
const lateResolutionReason = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

// Section 12: once resolution_due_at has passed, resolving requires a
// late_resolution_reason regardless of which resolution type is chosen.
const isLate = computed(() => {
  if (!props.discrepancyItem) return false
  if (['OVERDUE', 'ESCALATED', 'SUPERVISOR_REQUIRED'].includes(props.discrepancyItem.status)) return true
  const dueAt = props.discrepancyItem.resolution_due_at
  if (!dueAt) return false
  const due = new Date(dueAt)
  return !Number.isNaN(due.getTime()) && due.getTime() <= Date.now()
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resolutionType.value = 'RESEND'
      resolutionNote.value = ''
      lateResolutionReason.value = ''
      errorMessage.value = ''
    }
  }
)

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  if (!props.discrepancyItem) return

  const note = resolutionNote.value.trim()
  if (resolutionType.value === 'CLOSE_WITH_REASON' && !note) {
    errorMessage.value = 'Resolution note is required for Close with Reason.'
    return
  }
  const lateReason = lateResolutionReason.value.trim()
  if (isLate.value && !lateReason) {
    errorMessage.value = 'Late resolution reason is required for an overdue discrepancy.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await resolveWarehouseDiscrepancy(props.discrepancyItem.id, {
      resolution_type: resolutionType.value,
      resolution_note: note || null,
      late_resolution_reason: lateReason || null,
    })
    emit('resolved', props.discrepancyItem.id)
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to resolve delivery discrepancy.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
