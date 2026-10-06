<template>
  <div
    class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div
      v-if="$slots.toolbar"
      class="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <slot name="toolbar" />
    </div>

    <div class="max-w-full overflow-x-auto custom-scrollbar">
      <table ref="tableRef" class="min-w-full base-table-responsive">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <slot name="head" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <slot />
        </tbody>
      </table>
    </div>

    <div
      v-if="$slots.pagination"
      class="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <slot name="pagination" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated } from 'vue'

// On small screens the table is rendered as a stack of cards (see the
// `.base-table-responsive` styles below). Every row/column here is authored
// as plain <tr>/<td> markup by each page-specific table, so instead of
// touching every one of those files we read the column titles straight out
// of <thead> and stamp them onto each <td> as a `data-label`, which the CSS
// then shows via `::before` when the table collapses into cards.
const tableRef = ref(null)

function syncMobileLabels() {
  const table = tableRef.value
  if (!table) return

  const labels = Array.from(table.querySelectorAll(':scope > thead > tr > th')).map(
    (th) => th.textContent?.trim() ?? ''
  )
  if (!labels.length) return

  table.querySelectorAll(':scope > tbody > tr').forEach((row) => {
    row.querySelectorAll(':scope > td').forEach((cell, index) => {
      // Rows using colspan (loading/empty/error states, or a nested table)
      // span the whole card instead of pairing with a single column label.
      if (cell.hasAttribute('colspan')) {
        cell.removeAttribute('data-label')
        return
      }
      const label = labels[index]
      if (label) cell.setAttribute('data-label', label)
    })
  })
}

onMounted(syncMobileLabels)
onUpdated(syncMobileLabels)
</script>

<style>
/* Not scoped: the <tr>/<td> markup below belongs to whichever page table
   uses <BaseTable>, so a scoped style here would never reach it. Everything
   is namespaced under .base-table-responsive to stay contained. */
@media (max-width: 767.98px) {
  .base-table-responsive > thead {
    display: none;
  }

  .base-table-responsive,
  .base-table-responsive > tbody {
    display: block;
    width: 100%;
  }

  .base-table-responsive > tbody {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .base-table-responsive > tbody > tr {
    display: block;
    width: 100%;
    border: 1px solid var(--color-gray-200);
    border-radius: 0.75rem;
    padding: 0 1rem;
  }

  .dark .base-table-responsive > tbody > tr {
    border-color: var(--color-gray-800);
  }

  .base-table-responsive > tbody > tr > td {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.625rem 0;
    text-align: right;
    border-top: 1px solid var(--color-gray-100);
  }

  .dark .base-table-responsive > tbody > tr > td {
    border-color: var(--color-gray-800);
  }

  .base-table-responsive > tbody > tr > td:first-child {
    border-top: none;
  }

  .base-table-responsive > tbody > tr > td[data-label]::before {
    content: attr(data-label);
    flex-shrink: 0;
    text-align: left;
    font-weight: 500;
    color: var(--color-gray-500);
  }

  .dark .base-table-responsive > tbody > tr > td[data-label]::before {
    color: var(--color-gray-400);
  }

  /* Loading/empty/error rows and any nested table (colspan cells) get the
     full card width instead of the label/value split. */
  .base-table-responsive > tbody > tr > td:not([data-label]) {
    display: block;
    text-align: center;
  }
}
</style>
