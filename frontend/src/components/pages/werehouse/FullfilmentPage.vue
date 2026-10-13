<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <ComponentCard>
        <FullfilmentTable ref="fulfillmentTableRef" @changed="refreshAll" />
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref } from "vue";
import AdminLayout from "@/components/layout/AdminLayout.vue";
import PageBreadcrumb from "@/components/common/PageBreadcrumb.vue";
import ComponentCard from "@/components/common/ComponentCard.vue";
import FullfilmentTable from "@/components/tables/FullfilmentTable.vue";

const currentPageTitle = ref("Fulfillment / Picking");

const fulfillmentTableRef = ref(null);

function refreshAll() {
  fulfillmentTableRef.value?.refresh();
}
</script>
