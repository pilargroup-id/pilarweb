<template>
  <div>
    <button
      @click="isDialogOpen = true"
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-error-600 shadow-theme-xs hover:bg-error-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
    >
      <TrashIcon class="h-4 w-4" />
      Delete
    </button>

    <DialogConfirmDelete
      :is-open="isDialogOpen"
      title="Delete Request Purpose"
      :message="`Delete request purpose '${purpose.name}'? This cannot be undone.`"
      :is-loading="isDeleting"
      :error-message="errorMessage"
      @close="isDialogOpen = false"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TrashIcon } from '@/icons'
import DialogConfirmDelete from '@/components/dialog/DialogConfirmDelete.vue'
import { deleteRequestPurpose } from '@/service/api'

const props = defineProps({
  purpose: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['deleted'])

const isDialogOpen = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')

async function handleDelete() {
  isDeleting.value = true
  errorMessage.value = ''
  try {
    await deleteRequestPurpose(props.purpose.id)
    isDialogOpen.value = false
    emit('deleted', props.purpose.id)
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to delete request purpose.'
  } finally {
    isDeleting.value = false
  }
}
</script>
