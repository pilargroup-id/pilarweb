<template>
  <button
    @click="handleDelete"
    type="button"
    :disabled="isDeleting"
    class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-error-600 shadow-theme-xs hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
  >
    <TrashIcon class="h-4 w-4" />
    Delete
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { TrashIcon } from '@/icons'
import { deleteRequestPurpose } from '@/service/api'

const props = defineProps({
  purpose: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['deleted'])

const isDeleting = ref(false)

async function handleDelete() {
  const confirmed = window.confirm(`Delete request purpose "${props.purpose.name}"? This cannot be undone.`)
  if (!confirmed) return

  isDeleting.value = true
  try {
    await deleteRequestPurpose(props.purpose.id)
    emit('deleted', props.purpose.id)
  } catch (err) {
    window.alert(err?.message || 'Failed to delete request purpose.')
  } finally {
    isDeleting.value = false
  }
}
</script>
