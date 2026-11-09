<template>
  <div class="inline-block">
    <button
      @click="isModalOpen = true"
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-theme-xs font-medium text-white shadow-theme-xs hover:bg-brand-600"
    >
      <UndoIcon class="h-4 w-4" />
      Open Block
    </button>

    <DialogOpenBlockViolation
      :is-open="isModalOpen"
      :violation="violation"
      @close="isModalOpen = false"
      @opened="(payload) => emit('opened', payload)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UndoIcon } from '@/icons'
import DialogOpenBlockViolation from '@/components/dialog/DialogOpenBlockViolation.vue'

defineProps({
  violation: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['opened'])

const isModalOpen = ref(false)
</script>
