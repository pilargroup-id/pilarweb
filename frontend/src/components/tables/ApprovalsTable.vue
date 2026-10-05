<template>
  <div class="space-y-5">
    <BaseTable>
      <template #toolbar>
        <div>
          <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Pending Approvals</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Requests awaiting your department approval.</p>
        </div>
      </template>

      <template #head>
        <TableHeadCell>Request No</TableHeadCell>
        <TableHeadCell>Requester</TableHeadCell>
        <TableHeadCell>Department</TableHeadCell>
        <TableHeadCell>Request Purpose</TableHeadCell>
        <TableHeadCell>Submitted</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
      </template>

      <!--
        No approval-listing or approval-action endpoint exists yet (see
        PILARWEB_FRONTEND_INTEGRATION.md section 2), so this renders the
        required "No pending approvals." empty state (section 20) instead of
        calling an invented endpoint. Wire this up to the real data source
        once the backend contract for approvals is added.
      -->
      <tr>
        <td colspan="6" class="px-5 py-10 text-center sm:px-6">
          <p class="text-gray-500 text-theme-sm dark:text-gray-400">No pending approvals.</p>
        </td>
      </tr>
    </BaseTable>
  </div>
</template>

<script setup>
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
</script>
