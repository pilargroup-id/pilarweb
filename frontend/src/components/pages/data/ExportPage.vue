<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <ComponentCard
        title="Export &amp; Reports"
        desc="Setiap ekspor dibuat sesuai permintaan sebagai file XLSX dan otomatis dibatasi pada data yang menjadi hak akses akun Anda. Setiap ekspor dicatat dalam Log Aktivitas."
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="report in REPORTS"
            :key="report.type"
            class="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
          >
            <div>
              <p class="font-medium text-gray-800 dark:text-white/90">{{ report.label }}</p>
              <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{{ report.description }}</p>
            </div>

            <div class="flex flex-col gap-2">
              <button
                @click="runExport(report.type)"
                :disabled="state[report.type]?.loading"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TableIcon class="h-4 w-4" />
                {{ state[report.type]?.loading ? 'Exporting...' : 'Export XLSX' }}
              </button>
              <p v-if="state[report.type]?.error" class="text-theme-xs text-error-600 dark:text-error-500">
                {{ state[report.type].error }}
              </p>
              <p v-else-if="state[report.type]?.success" class="text-theme-xs text-success-600 dark:text-success-500">
                Downloaded{{ state[report.type].rowCount !== null ? ` (${state[report.type].rowCount} rows)` : '' }}.
              </p>
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { TableIcon } from '@/icons'
import { exportData } from '@/service/templateApi'
import { triggerBlobDownload, parseBlobErrorMessage } from '@/utils/download'

const currentPageTitle = ref('Export & Reports')

const REPORTS = [
  { type: 'ASSET_LIST', label: 'Asset List', description: 'Semua aset dalam cakupan Anda beserta kategori, merek, model, lokasi, vendor, dan biaya.' },
  { type: 'ASSIGNMENTS', label: 'Assignments', description: 'Riwayat penugasan dan pengembalian aset dalam cakupan Anda.' },
  { type: 'TRANSFERS', label: 'Transfers', description: 'Perpindahan aset antar lokasi, perusahaan, dan departemen pengelola.' },
  { type: 'MAINTENANCE', label: 'Maintenance', description: 'Catatan pemeliharaan termasuk vendor, biaya, dan hasil.' },
  { type: 'DEPRECIATION', label: 'Depreciation', description: 'Entri buku besar penyusutan yang dihasilkan per aset dan periode.' },
  { type: 'CONSUMABLE_STOCK', label: 'Consumable Stock', description: 'Saldo stok consumable saat ini per lokasi.' },
  { type: 'CONSUMABLE_MOVEMENTS', label: 'Consumable Movements', description: 'Semua transaksi stok consumable: penerimaan, pengeluaran, transfer, penyesuaian, write-off.' },
  { type: 'CONSUMABLE_USAGE', label: 'Consumable Usage', description: 'Hanya transaksi pengeluaran consumable, untuk analisis pemakaian.' },
  { type: 'ACTIVITY_LOG', label: 'Activity Log', description: 'Jejak audit aktivitas sistem. Membutuhkan izin ekspor Log Aktivitas.' },
]

const state = reactive(
  Object.fromEntries(REPORTS.map((report) => [report.type, { loading: false, error: '', success: false, rowCount: null }]))
)

async function runExport(type) {
  const entry = state[type]
  entry.loading = true
  entry.error = ''
  entry.success = false
  try {
    const { blob, filename, rowCount } = await exportData(type)
    triggerBlobDownload(blob, filename)
    entry.success = true
    entry.rowCount = rowCount
  } catch (err) {
    entry.error = await parseBlobErrorMessage(err, 'Failed to generate export.')
  } finally {
    entry.loading = false
  }
}
</script>
