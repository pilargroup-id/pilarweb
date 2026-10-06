<template>
  <div>
    <button
      @click="isModalOpen = true"
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
    >
      <RefreshIcon class="h-4 w-4" />
      Set Workflow
    </button>

    <DialogAssignPurposeWorkflow
      :is-open="isModalOpen"
      :purpose="purpose"
      :workflows="workflows"
      :current-workflow-id="currentWorkflowId"
      @close="isModalOpen = false"
      @assigned="emit('assigned')"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RefreshIcon } from '@/icons'
import DialogAssignPurposeWorkflow from '@/components/dialog/DialogAssignPurposeWorkflow.vue'

defineProps({
  purpose: {
    type: Object,
    required: true,
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

const emit = defineEmits(['assigned'])

const isModalOpen = ref(false)
</script>
