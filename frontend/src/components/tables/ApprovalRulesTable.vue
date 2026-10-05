<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Approval Rules</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Requester eligibility and Department Approval rules, matched by department.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchApprovalRules"
            :disabled="isLoading"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            <RefreshIcon :class="['h-4 w-4', { 'animate-spin': isLoading }]" />
            Refresh
          </button>
          <ButtonCreateApprovalRules @created="fetchApprovalRules" />
        </div>
      </template>

      <template #head>
        <TableHeadCell>Code</TableHeadCell>
        <TableHeadCell>Name</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Requester Block Level</TableHeadCell>
        <TableHeadCell>Approver Min Level</TableHeadCell>
        <TableHeadCell>Allow Higher Level</TableHeadCell>
        <TableHeadCell>Priority</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <tr v-if="isLoading">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading approval rules...</p>
        </td>
      </tr>
      <tr v-else-if="errorMessage">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-error-600 text-theme-sm dark:text-error-500">{{ errorMessage }}</p>
        </td>
      </tr>
      <tr v-else-if="!rules.length">
        <td colspan="8" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No approval rules found.</p>
        </td>
      </tr>
      <tr
        v-for="rule in rules"
        v-else
        :key="rule.id"
        class="border-t border-gray-100 dark:border-gray-800"
      >
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {{ rule.code }}
          </span>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ rule.name }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">
            {{ rule.department_name || (rule.department_id ? `#${rule.department_id}` : 'Global (fallback)') }}
          </p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">
            {{ rule.requester_block_min_job_level_value ?? '-' }}
          </p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">
            {{ rule.approver_min_job_level_value ?? '-' }}
            <span v-if="rule.approver_job_level_name" class="text-gray-400 dark:text-gray-500">
              ({{ rule.approver_job_level_name }})
            </span>
          </p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="rule.allow_higher_job_level ? 'success' : 'light'" size="sm">
            {{ rule.allow_higher_job_level ? 'Yes' : 'No' }}
          </Badge>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ rule.priority }}</p>
        </td>
        <td class="px-5 py-4 whitespace-nowrap sm:px-6">
          <Badge :color="rule.is_active ? 'success' : 'light'" size="sm">
            {{ rule.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getApprovalRules } from '@/service/api'
import Badge from '@/components/ui/Badge.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import ButtonCreateApprovalRules from '@/components/buttons/create/master/ButtonCreateApprovalRules.vue'
import { RefreshIcon } from '@/icons'

const rules = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

async function fetchApprovalRules() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await getApprovalRules()
    rules.value = res?.data ?? []
  } catch (err) {
    rules.value = []
    errorMessage.value = err?.message || 'Failed to load approval rules.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchApprovalRules())
</script>
