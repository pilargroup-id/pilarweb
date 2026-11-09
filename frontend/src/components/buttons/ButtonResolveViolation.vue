<template>
  <div class="inline-block">
    <button
      @click="isModalOpen = true"
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
    >
      <FileCheckIcon class="h-4 w-4" />
      Resolve
    </button>

    <DialogResolveViolation
      :is-open="isModalOpen"
      :violation="violation"
      @close="isModalOpen = false"
      @resolved="(payload) => emit('resolved', payload)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FileCheckIcon } from '@/icons'
import DialogResolveViolation from '@/components/dialog/DialogResolveViolation.vue'

defineProps({
  violation: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['resolved'])

const isModalOpen = ref(false)
</script>
