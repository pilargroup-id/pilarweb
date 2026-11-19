<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
      >
        <div class="sidebar-gradient-bg relative shrink-0 rounded-t-3xl px-6 py-6 lg:px-8">
          <button
            @click="close"
            type="button"
            class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <CloseIcon class="h-5 w-5" />
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Reject PB</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ queueItem?.request_number }}
            <span v-if="queueItem?.requester_name">&middot; {{ queueItem.requester_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Seluruh item pada PB
              <span class="font-medium text-gray-800 dark:text-white/90">{{ queueItem?.request_number }}</span>
              akan ditolak dan status PB menjadi
              <span class="font-medium text-error-600 dark:text-error-500">Rejected</span>.
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Reason <span class="text-error-500">*</span>
              </label>
              <textarea
                v-model="reason"
                rows="3"
                placeholder="Jelaskan alasan PB ini ditolak"
                required
                class="dark:bg-dark-900 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                :class="hasReasonError ? 'border-error-400 dark:border-error-500' : 'border-gray-300 dark:border-gray-700'"
              ></textarea>
              <p v-if="hasReasonError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">Alasan wajib diisi.</p>
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">
              {{ errorMessage }}
            </p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="close"
                type="button"
                class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || !reason.trim()"
                class="flex justify-center rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? 'Rejecting...' : 'Reject PB' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import { CloseIcon } from '@/icons'
import { rejectFinanceRequest } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  queueItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'rejected'])

const reason = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const hasReasonError = ref(false)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      reason.value = ''
      errorMessage.value = ''
      hasReasonError.value = false
    }
  }
)

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  if (!props.queueItem?.request_id) return
  if (!reason.value.trim()) {
    hasReasonError.value = true
    return
  }

  hasReasonError.value = false
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await rejectFinanceRequest(props.queueItem.request_id, { reason: reason.value.trim() })
    emit('rejected')
    isSubmitting.value = false
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal menolak PB.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
