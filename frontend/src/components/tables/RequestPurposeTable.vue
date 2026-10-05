<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Request Purposes</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Master list of request purposes used when requesters create a new request.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchRequestPurposes"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
          <ButtonCreateRequestPurpose @created="fetchRequestPurposes" />
        </div>
      </template>

      <template #head>
        <TableHeadCell>Actions</TableHeadCell>
        <TableHeadCell>Code</TableHeadCell>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Description</TableHeadCell>
        <TableHeadCell>Sort Order</TableHeadCell>
        <TableHeadCell>Workflow</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading request purposes...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!purposes.length">
        <td colspan="7" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No request purposes found.</p>
        </td>
      </tr>
      <tr
        v-for="purpose in purposes"
        v-else
        :key="purpose.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 sm:px-6">
          <div class="flex items-center gap-2">
            <ButtonUpdateRequestPurpose :purpose="purpose" @updated="fetchRequestPurposes" />
            <ButtonAssignPurposeWorkflow
              :purpose="purpose"
              :workflows="workflows"
              :current-workflow-id="assignmentByPurposeId[purpose.id]?.workflow_definition_id ?? null"
              @assigned="fetchAssignments"
            />
            <ButtonDeleteRequestPurpose :purpose="purpose" @deleted="fetchRequestPurposes" />
          </div>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ purpose.code }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ purpose.name }}</p>
        </td>
        <td class="px-5 py-4 sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ purpose.description || '-' }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ purpose.sort_order }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge
            v-if="assignmentByPurposeId[purpose.id]"
            :color="assignmentByPurposeId[purpose.id].requires_return ? 'success' : 'light'"
            size="sm"
          >
            {{ assignmentByPurposeId[purpose.id].requires_return ? 'Returnable' : 'Non-Returnable' }}
          </Badge>
          <span v-else class="text-gray-400 text-theme-xs dark:text-gray-500">Not set</span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="purpose.is_active ? 'success' : 'light'" size="sm">
            {{ purpose.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRequestPurposes, getWorkflows, getPurposeWorkflows } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import ButtonCreateRequestPurpose from '@/components/buttons/create/ButtonCreateRequestPurpose.vue'
import ButtonUpdateRequestPurpose from '@/components/buttons/update/ButtonUpdateRequestPurpose.vue'
import ButtonAssignPurposeWorkflow from '@/components/buttons/update/ButtonAssignPurposeWorkflow.vue'
import ButtonDeleteRequestPurpose from '@/components/buttons/delete/ButtonDeleteRequestPurpose.vue'
import { RefreshIcon } from '@/icons'

const purposes = ref([])
const workflows = ref([])
const assignments = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const assignmentByPurposeId = computed(() => {
  const map = {}
  for (const assignment of assignments.value) {
    map[assignment.request_purpose_id] = assignment
  }
  return map
})

async function fetchAssignments() {
  try {
    const res = await getPurposeWorkflows()
    assignments.value = res?.data ?? []
  } catch {
    assignments.value = []
  }
}

async function fetchRequestPurposes() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [purposesRes, workflowsRes] = await Promise.all([
      getRequestPurposes(),
      getWorkflows(),
    ])
    purposes.value = purposesRes?.data ?? []
    workflows.value = workflowsRes?.data ?? []
    await fetchAssignments()
  } catch (err) {
    purposes.value = []
    errorMessage.value = err?.message || 'Failed to load request purposes.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchRequestPurposes())
</script>
