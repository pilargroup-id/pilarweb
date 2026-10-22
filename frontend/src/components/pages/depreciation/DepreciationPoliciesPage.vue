<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <ComponentCard
        title="Depreciation Policies"
        desc="Template tingkat departemen untuk masa manfaat dan nilai sisa. Mengubah kebijakan tidak mengubah aset yang sudah dikonfigurasi."
      >
        <DepreciationPoliciesTable />
      </ComponentCard>

      <ComponentCard
        title="Category Default Policy"
        desc="Sarankan kebijakan secara otomatis saat aset dalam suatu kategori dikonfigurasi untuk penyusutan."
      >
        <DepreciationCategoryDefaultCard />
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import DepreciationPoliciesTable from '@/components/tables/DepreciationPoliciesTable.vue'
import DepreciationCategoryDefaultCard from '@/components/pages/depreciation/DepreciationCategoryDefaultCard.vue'

const currentPageTitle = ref('Depreciation Policies')
</script>
