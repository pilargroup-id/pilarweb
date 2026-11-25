<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <ComponentCard>
        <FinanceInvoiceGroupingTable />
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref } from "vue";
import AdminLayout from "@/components/layout/AdminLayout.vue";
import PageBreadcrumb from "@/components/common/PageBreadcrumb.vue";
import ComponentCard from "@/components/common/ComponentCard.vue";
import FinanceInvoiceGroupingTable from "@/components/tables/FinanceInvoiceGroupingTable.vue";

const currentPageTitle = ref("Invoice Grouping");
</script>
