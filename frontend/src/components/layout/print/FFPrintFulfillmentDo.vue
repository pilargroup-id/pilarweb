<template>
  <div v-if="active" class="ff-print-fdo-root">
    <div class="fdo-header">
      <div>
        <h1 class="fdo-title">Delivery Order</h1>
        <p class="fdo-subtitle">Warehouse Fulfillment / Delivery Document</p>
      </div>
      <div class="fdo-header-right">
        <p class="fdo-company">{{ companyName || '-' }}</p>
        <p class="fdo-doc-number">{{ fulfillmentNumber || '-' }}</p>
      </div>
    </div>

    <div class="fdo-meta">
      <div class="fdo-meta-col">
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">Request No.</span>
          <span class="fdo-meta-value">{{ requestNumber || '-' }}</span>
        </div>
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">Requester</span>
          <span class="fdo-meta-value">{{ requesterName || '-' }}</span>
        </div>
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">Department</span>
          <span class="fdo-meta-value">{{ departmentName || '-' }}</span>
        </div>
      </div>
      <div class="fdo-meta-col">
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">Source WH</span>
          <span class="fdo-meta-value">{{ sourceWarehouseName || '-' }}</span>
        </div>
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">IWT No.</span>
          <span class="fdo-meta-value">{{ inventoryTransferNumber || '-' }}</span>
        </div>
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">Note</span>
          <span class="fdo-meta-value">{{ note || '-' }}</span>
        </div>
        <div class="fdo-meta-row">
          <span class="fdo-meta-label">Printed At</span>
          <span class="fdo-meta-value">{{ formatDateTime(printedAt) }}</span>
        </div>
      </div>
    </div>

    <table class="fdo-table">
      <thead>
        <tr>
          <th class="fdo-col-no">No</th>
          <th>Item</th>
          <th class="fdo-col-qty">Actual Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.id ?? index">
          <td class="fdo-col-no">{{ index + 1 }}</td>
          <td>
            <span class="fdo-item-name">{{ row.item_name }}</span>
            <span class="fdo-item-code">{{ row.item_code }}</span>
          </td>
          <td class="fdo-col-qty">{{ formatQty(row.actual_qty) }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="3" class="fdo-empty">No items on this fulfillment.</td>
        </tr>
      </tbody>
    </table>

    <div class="fdo-signatures">
      <div class="fdo-signature-box">
        <p class="fdo-signature-label">Prepared By</p>
        <div class="fdo-signature-line"></div>
        <p class="fdo-signature-caption">Name / Date</p>
      </div>
      <div class="fdo-signature-box">
        <p class="fdo-signature-label">Received By</p>
        <div class="fdo-signature-line"></div>
        <p class="fdo-signature-caption">Name / Date</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  active: { type: Boolean, default: false },
  requestNumber: { type: String, default: '' },
  fulfillmentNumber: { type: String, default: '' },
  companyName: { type: String, default: '' },
  requesterName: { type: String, default: '' },
  departmentName: { type: String, default: '' },
  sourceWarehouseName: { type: String, default: '' },
  inventoryTransferNumber: { type: String, default: '' },
  note: { type: String, default: '' },
  printedAt: { type: [String, Date], default: null },
  rows: { type: Array, default: () => [] },
})

function formatQty(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<style>
/* Not scoped on purpose: this block must hide the rest of the app during
   print, regardless of where this component is teleported in the DOM.
   We hide #app (display: none) rather than using visibility: hidden on
   every body element, because visibility keeps hidden elements in the
   layout flow -- the app's full page height would still paginate into
   extra blank pages even though nothing is visible on them. */
.ff-print-fdo-root {
  display: none;
}

@media print {
  body > #app {
    display: none !important;
  }

  .ff-print-fdo-root {
    display: block !important;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  @page {
    size: A5;
    margin: 10mm 9mm;
  }
}

.ff-print-fdo-root {
  font-family: Arial, Helvetica, sans-serif;
  color: #111827;
  font-size: 9.5px;
  line-height: 1.35;
}

.ff-print-fdo-root .fdo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #111827;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.ff-print-fdo-root .fdo-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ff-print-fdo-root .fdo-subtitle {
  font-size: 11px;
  color: #4b5563;
  margin: 2px 0 0;
}

.ff-print-fdo-root .fdo-header-right {
  text-align: right;
}

.ff-print-fdo-root .fdo-company {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.ff-print-fdo-root .fdo-doc-number {
  font-size: 11px;
  color: #4b5563;
  margin: 2px 0 0;
}

.ff-print-fdo-root .fdo-meta {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
}

.ff-print-fdo-root .fdo-meta-col {
  flex: 1;
  min-width: 0;
}

.ff-print-fdo-root .fdo-meta-row {
  display: flex;
  padding: 1px 0;
}

.ff-print-fdo-root .fdo-meta-label {
  width: 80px;
  flex-shrink: 0;
  color: #4b5563;
}

.ff-print-fdo-root .fdo-meta-label::after {
  content: ':';
  margin-left: 4px;
}

.ff-print-fdo-root .fdo-meta-value {
  font-weight: 600;
}

.ff-print-fdo-root .fdo-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
}

.ff-print-fdo-root .fdo-table th,
.ff-print-fdo-root .fdo-table td {
  border: 1px solid #9ca3af;
  padding: 4px 5px;
  text-align: left;
  vertical-align: top;
}

.ff-print-fdo-root .fdo-table thead th {
  background: #f3f4f6;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
}

.ff-print-fdo-root .fdo-table tbody tr {
  break-inside: avoid;
}

.ff-print-fdo-root .fdo-col-no {
  width: 32px;
  text-align: center;
}

.ff-print-fdo-root .fdo-col-qty {
  width: 70px;
  text-align: right;
}

.ff-print-fdo-root .fdo-item-name {
  display: block;
  font-weight: 600;
}

.ff-print-fdo-root .fdo-item-code {
  display: block;
  color: #4b5563;
  font-size: 10px;
}

.ff-print-fdo-root .fdo-empty {
  text-align: center;
  color: #6b7280;
  padding: 16px;
}

.ff-print-fdo-root .fdo-signatures {
  display: flex;
  justify-content: space-between;
  margin-top: 28px;
  break-inside: avoid;
}

.ff-print-fdo-root .fdo-signature-box {
  flex: 0 0 45%;
  text-align: center;
}

.ff-print-fdo-root .fdo-signature-label {
  margin: 0 0 28px;
  font-weight: 600;
}

.ff-print-fdo-root .fdo-signature-line {
  border-top: 1px solid #111827;
  margin: 0 12px;
}

.ff-print-fdo-root .fdo-signature-caption {
  margin: 6px 0 0;
  font-size: 9px;
  color: #6b7280;
}
</style>
