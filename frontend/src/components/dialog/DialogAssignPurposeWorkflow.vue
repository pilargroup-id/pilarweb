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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">
            Set Workflow
          </h4>
          <p class="pr-12 text-sm text-white/70">
            Choose which workflow <span class="font-medium text-white/90">{{ purpose?.name }}</span>
            should use for new requests. Existing requests keep their original workflow.
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
        <form class="flex flex-col gap-3" @submit.prevent="submit">
          <label
            v-for="workflow in workflows"
            :key="workflow.id"
            class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors"
            :class="
              selectedWorkflowId === workflow.id
                ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                : 'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]'
            "
          >
            <input
              type="radio"
              class="mt-1 h-4 w-4 accent-brand-500"
              :value="workflow.id"
              v-model="selectedWorkflowId"
            />
            <span class="flex-1">
              <span class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-800 dark:text-white/90">{{ workflow.name }}</span>
                <Badge :color="workflow.requires_return ? 'success' : 'light'" size="sm">
                  {{ workflow.requires_return ? 'Returnable' : 'Non-Returnable' }}
                </Badge>
              </span>
              <span class="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                {{ workflow.description || '-' }}
              </span>
            </span>
          </label>

          <p v-if="!workflows.length" class="text-sm text-gray-500 dark:text-gray-400">
            No active workflows available.
          </p>

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
              :disabled="isSubmitting || !selectedWorkflowId"
              class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isSubmitting ? 'Saving...' : 'Save' }}
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
import Badge from '@/components/ui/Badge.vue'
import { assignPurposeWorkflow } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  purpose: {
    type: Object,
    default: null,
  },
  workflows: {
    type: Array,
    default: () => [],
  },
  currentWorkflowId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['close', 'assigned'])

const isSubmitting = ref(false)
const errorMessage = ref('')
const selectedWorkflowId = ref(null)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      selectedWorkflowId.value = props.currentWorkflowId ?? null
      errorMessage.value = ''
    }
  }
)

function close() {
  emit('close')
}

async function submit() {
  if (!selectedWorkflowId.value || !props.purpose) return
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await assignPurposeWorkflow({
      request_purpose_id: props.purpose.id,
      workflow_definition_id: selectedWorkflowId.value,
    })
    emit('assigned')
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to assign workflow.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
