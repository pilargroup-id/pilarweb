<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="no-scrollbar relative max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8"
      >
        <button
          @click="close"
          type="button"
          class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-300"
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

        <h4 class="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ isApprove ? 'Approve Request' : 'Reject Request' }}
        </h4>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {{ approval?.request_number }}
          <span v-if="approval?.requester_name">&middot; {{ approval.requester_name }}</span>
        </p>

        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              {{ isApprove ? 'Note' : 'Reason *' }}
            </label>
            <textarea
              v-model="note"
              rows="3"
              :placeholder="isApprove ? 'Optional note' : 'Explain why this request does not meet department requirements'"
              :required="!isApprove"
              class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            ></textarea>
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
              :disabled="isSubmitting || (!isApprove && !note.trim())"
              :class="[
                'flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60',
                isApprove ? 'bg-success-500 hover:bg-success-600' : 'bg-error-500 hover:bg-error-600',
              ]"
            >
              {{ isSubmitting ? 'Saving...' : isApprove ? 'Approve' : 'Reject' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import { approveApproval, rejectApproval } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  approval: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: 'approve', // 'approve' | 'reject'
  },
})

const emit = defineEmits(['close', 'decided'])

const isApprove = computed(() => props.mode === 'approve')

const note = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      note.value = ''
      errorMessage.value = ''
    }
  }
)

function close() {
  emit('close')
}

async function submit() {
  if (!props.approval) return
  if (!isApprove.value && !note.value.trim()) {
    errorMessage.value = 'Reason is required.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    if (isApprove.value) {
      await approveApproval(props.approval.id, { note: note.value.trim() || null })
    } else {
      await rejectApproval(props.approval.id, { reason: note.value.trim() })
    }
    emit('decided')
    close()
  } catch (err) {
    errorMessage.value = err?.message || `Failed to ${isApprove.value ? 'approve' : 'reject'} request.`
  } finally {
    isSubmitting.value = false
  }
}
</script>
