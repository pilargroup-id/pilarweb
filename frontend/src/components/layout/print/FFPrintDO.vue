<template>
  <div class="ff-print-do-root">
    <div class="pd-header">
      <div>
        <h1 class="pd-title">Delivery Order</h1>
        <p class="pd-subtitle">Warehouse Inventory Transfer Document</p>
      </div>
      <div class="pd-header-right">
        <p class="pd-company">{{ companyName || '-' }}</p>
        <p class="pd-doc-number">{{ transferNumber || '-' }}</p>
      </div>
    </div>

    <div class="pd-meta">
      <div class="pd-meta-col">
        <div class="pd-meta-row">
          <span class="pd-meta-label">Request No.</span>
          <span class="pd-meta-value">{{ requestNumber || '-' }}</span>
        </div>
        <div class="pd-meta-row">
          <span class="pd-meta-label">Requester</span>
          <span class="pd-meta-value">{{ requesterName || '-' }}</span>
        </div>
        <div class="pd-meta-row">
          <span class="pd-meta-label">Department</span>
          <span class="pd-meta-value">{{ departmentName || '-' }}</span>
        </div>
        <div class="pd-meta-row">
          <span class="pd-meta-label">Transfer Date</span>
          <span class="pd-meta-value">{{ formatDate(transferDate) }}</span>
        </div>
      </div>
      <div class="pd-meta-col">
        <div class="pd-meta-row">
          <span class="pd-meta-label">Source</span>
          <span class="pd-meta-value">{{ sourceWarehouseName || sourceWarehouseCode || '-' }}</span>
        </div>
        <div class="pd-meta-row">
          <span class="pd-meta-label">Destination</span>
          <span class="pd-meta-value">{{ destinationWarehouseName || destinationWarehouseCode || '-' }}</span>
        </div>
        <div class="pd-meta-row">
          <span class="pd-meta-label">Note</span>
          <span class="pd-meta-value">{{ note || '-' }}</span>
        </div>
        <div class="pd-meta-row">
          <span class="pd-meta-label">Printed At</span>
          <span class="pd-meta-value">{{ formatDateTime(printedAt) }}</span>
        </div>
      </div>
    </div>

    <table class="pd-table">
      <thead>
        <tr>
          <th class="pd-col-no">No</th>
          <th>Item</th>
          <th class="pd-col-qty">Qty Transferred</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.id ?? index">
          <td class="pd-col-no">{{ index + 1 }}</td>
          <td>
            <span class="pd-item-name">{{ row.item_name || '-' }}</span>
            <span class="pd-item-code">{{ row.item_code }}</span>
          </td>
          <td class="pd-col-qty">{{ formatQty(row.qty) }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="3" class="pd-empty">No items on this Inventory Transfer.</td>
        </tr>
      </tbody>
    </table>

    <div class="pd-signatures">
      <div class="pd-signature-box">
        <p class="pd-signature-label">Prepared By</p>
        <div class="pd-signature-line"></div>
        <p class="pd-signature-caption">Name / Date</p>
      </div>
      <div class="pd-signature-box">
        <p class="pd-signature-label">Received By</p>
        <div class="pd-signature-line"></div>
        <p class="pd-signature-caption">Name / Date</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  requestNumber: { type: String, default: '' },
  transferNumber: { type: String, default: '' },
  companyName: { type: String, default: '' },
  requesterName: { type: String, default: '' },
  departmentName: { type: String, default: '' },
  sourceWarehouseCode: { type: String, default: '' },
  sourceWarehouseName: { type: String, default: '' },
  destinationWarehouseCode: { type: String, default: '' },
  destinationWarehouseName: { type: String, default: '' },
  transferDate: { type: [String, Date], default: null },
  note: { type: String, default: '' },
  printedAt: { type: [String, Date], default: null },
  rows: { type: Array, default: () => [] },
})

function formatQty(value) {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return '-'
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function formatDate(value) {
  if (!value) return '-'
  const text = String(value)
  const dateOnly = text.length >= 10 ? text.slice(0, 10) : text
  const date = new Date(`${dateOnly}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateOnly
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
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
.ff-print-do-root {
  display: none;
}

@media print {
  body > #app {
    display: none !important;
  }

  .ff-print-do-root {
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

.ff-print-do-root {
  font-family: Arial, Helvetica, sans-serif;
  color: #111827;
  font-size: 9.5px;
  line-height: 1.35;
}

.ff-print-do-root .pd-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #111827;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.ff-print-do-root .pd-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ff-print-do-root .pd-subtitle {
  font-size: 11px;
  color: #4b5563;
  margin: 2px 0 0;
}

.ff-print-do-root .pd-header-right {
  text-align: right;
}

.ff-print-do-root .pd-company {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.ff-print-do-root .pd-doc-number {
  font-size: 11px;
  color: #4b5563;
  margin: 2px 0 0;
}

.ff-print-do-root .pd-meta {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
}

.ff-print-do-root .pd-meta-col {
  flex: 1;
  min-width: 0;
}

.ff-print-do-root .pd-meta-row {
  display: flex;
  padding: 1px 0;
}

.ff-print-do-root .pd-meta-label {
  width: 80px;
  flex-shrink: 0;
  color: #4b5563;
}

.ff-print-do-root .pd-meta-label::after {
  content: ':';
  margin-left: 4px;
}

.ff-print-do-root .pd-meta-value {
  font-weight: 600;
}

.ff-print-do-root .pd-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
}

.ff-print-do-root .pd-table th,
.ff-print-do-root .pd-table td {
  border: 1px solid #9ca3af;
  padding: 4px 5px;
  text-align: left;
  vertical-align: top;
}

.ff-print-do-root .pd-table thead th {
  background: #f3f4f6;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
}

.ff-print-do-root .pd-table tbody tr {
  break-inside: avoid;
}

.ff-print-do-root .pd-col-no {
  width: 32px;
  text-align: center;
}

.ff-print-do-root .pd-col-qty {
  width: 90px;
  text-align: right;
}

.ff-print-do-root .pd-item-name {
  display: block;
  font-weight: 600;
}

.ff-print-do-root .pd-item-code {
  display: block;
  color: #4b5563;
  font-size: 10px;
}

.ff-print-do-root .pd-empty {
  text-align: center;
  color: #6b7280;
  padding: 16px;
}

.ff-print-do-root .pd-signatures {
  display: flex;
  justify-content: space-between;
  margin-top: 28px;
  break-inside: avoid;
}

.ff-print-do-root .pd-signature-box {
  flex: 0 0 45%;
  text-align: center;
}

.ff-print-do-root .pd-signature-label {
  margin: 0 0 28px;
  font-weight: 600;
}

.ff-print-do-root .pd-signature-line {
  border-top: 1px solid #111827;
  margin: 0 12px;
}

.ff-print-do-root .pd-signature-caption {
  margin: 6px 0 0;
  font-size: 9px;
  color: #6b7280;
}
</style>
