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
            <svg class="fill-current" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
                fill=""
              />
            </svg>
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Financial Closing Setting</h4>
          <p class="pr-12 text-sm text-white/70">
            Defines the closing day and timezone used to derive period start/end dates. Requires admin access.
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Closing Day *</label>
              <input
                v-model.number="closingDay"
                type="number"
                min="1"
                max="31"
                required
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <p class="mt-1 text-xs text-gray-400">Day of the month (1-31) when a period closes.</p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Timezone *</label>
              <input
                v-model="timezone"
                type="text"
                required
                placeholder="Asia/Jakarta"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">
              {{ errorMessage }}
            </p>

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
                class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? 'Saving...' : 'Save Setting' }}
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
import { updateFinancialClosing } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  setting: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved'])

const closingDay = ref(1)
const timezone = ref('Asia/Jakarta')
const isSubmitting = ref(false)
const errorMessage = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      closingDay.value = props.setting?.closing_day ?? 1
      timezone.value = props.setting?.timezone ?? 'Asia/Jakarta'
      errorMessage.value = ''
    }
  }
)

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  errorMessage.value = ''
  const day = Number(closingDay.value)
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    errorMessage.value = 'Closing day must be between 1 and 31.'
    return
  }
  if (!timezone.value.trim()) {
    errorMessage.value = 'Timezone is required.'
    return
  }

  isSubmitting.value = true
  try {
    const res = await updateFinancialClosing({ closing_day: day, timezone: timezone.value.trim() })
    emit('saved', res?.data)
    emit('close')
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to update financial closing setting.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
