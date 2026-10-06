<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <ComponentCard>
        <FullfilmentTable ref="pickingTableRef" @changed="refreshAll" />
      </ComponentCard>
      <ComponentCard>
        <InventoryTransferTable ref="transferTableRef" @changed="refreshAll" />
      </ComponentCard>
      <ComponentCard>
        <HandoverTable ref="handoverTableRef" @changed="refreshAll" />
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
import InventoryTransferTable from "@/components/tables/InventoryTransferTable.vue";
import HandoverTable from "@/components/tables/HandoverTable.vue";

const currentPageTitle = ref("Fulfillment / Picking");

const pickingTableRef = ref(null);
const transferTableRef = ref(null);
const handoverTableRef = ref(null);

// A Picking/Inventory Transfer/Handover action moves a fulfillment between
// these three stages, so any single table's change can add or remove a row
// in either of the other two — refresh all three to keep them in sync.
function refreshAll() {
  pickingTableRef.value?.refresh();
  transferTableRef.value?.refresh();
  handoverTableRef.value?.refresh();
}
</script>
