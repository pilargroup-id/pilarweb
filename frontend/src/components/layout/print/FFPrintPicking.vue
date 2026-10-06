<template>
  <div class="ff-print-picking-root">
    <div class="pp-header">
      <div>
        <h1 class="pp-title">Picking Slip</h1>
        <p class="pp-subtitle">Warehouse Fulfillment / Picking Document</p>
      </div>
      <div class="pp-header-right">
        <p class="pp-company">{{ companyName || '-' }}</p>
        <p class="pp-doc-number">{{ fulfillmentNumber || '-' }}</p>
      </div>
    </div>

    <div class="pp-meta">
      <div class="pp-meta-col">
        <div class="pp-meta-row">
          <span class="pp-meta-label">Request No.</span>
          <span class="pp-meta-value">{{ requestNumber || '-' }}</span>
        </div>
        <div class="pp-meta-row">
          <span class="pp-meta-label">Requester</span>
          <span class="pp-meta-value">{{ requesterName || '-' }}</span>
        </div>
        <div class="pp-meta-row">
          <span class="pp-meta-label">Department</span>
          <span class="pp-meta-value">{{ departmentName || '-' }}</span>
        </div>
        <div class="pp-meta-row">
          <span class="pp-meta-label">Purpose</span>
          <span class="pp-meta-value">{{ requestPurposeName || '-' }}</span>
        </div>
      </div>
      <div class="pp-meta-col">
        <div class="pp-meta-row">
          <span class="pp-meta-label">Accepted By</span>
          <span class="pp-meta-value">{{ acceptedByName || '-' }}</span>
        </div>
        <div class="pp-meta-row">
          <span class="pp-meta-label">Accepted At</span>
          <span class="pp-meta-value">{{ formatDateTime(acceptedAt) }}</span>
        </div>
        <div class="pp-meta-row">
          <span class="pp-meta-label">Status</span>
          <span class="pp-meta-value">{{ statusLabel }}</span>
        </div>
        <div class="pp-meta-row">
          <span class="pp-meta-label">Printed At</span>
          <span class="pp-meta-value">{{ formatDateTime(printedAt) }}</span>
        </div>
      </div>
    </div>

    <table class="pp-table">
      <thead>
        <tr>
          <th class="pp-col-no">No</th>
          <th>Item</th>
          <th class="pp-col-qty">Approved Qty</th>
          <th class="pp-col-qty">Actual Qty</th>
          <th class="pp-col-qty">Shortage</th>
          <th>Reason</th>
          <th>Remainder</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="row.id ?? index">
          <td class="pp-col-no">{{ index + 1 }}</td>
          <td>
            <span class="pp-item-name">{{ row.item_name }}</span>
            <span class="pp-item-code">{{ row.item_code }}</span>
          </td>
          <td class="pp-col-qty">{{ formatQty(row.max_qty) }}</td>
          <td class="pp-col-qty">{{ formatQty(row.actual_qty) }}</td>
          <td class="pp-col-qty">{{ formatQty(row.shortage_qty) }}</td>
          <td>{{ row.shortage_reason_label || '-' }}</td>
          <td>{{ row.remainder_label || '-' }}</td>
          <td>{{ row.shortage_note || '-' }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="8" class="pp-empty">No items on this fulfillment.</td>
        </tr>
      </tbody>
    </table>

    <div class="pp-signatures">
      <div class="pp-signature-box">
        <p class="pp-signature-label">Picked By</p>
        <div class="pp-signature-line"></div>
        <p class="pp-signature-caption">Name / Date</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  requestNumber: { type: String, default: '' },
  fulfillmentNumber: { type: String, default: '' },
  companyName: { type: String, default: '' },
  requesterName: { type: String, default: '' },
  departmentName: { type: String, default: '' },
  requestPurposeName: { type: String, default: '' },
  acceptedByName: { type: String, default: '' },
  acceptedAt: { type: [String, Date], default: null },
  status: { type: String, default: '' },
  printedAt: { type: [String, Date], default: null },
  rows: { type: Array, default: () => [] },
})

const statusLabel = computed(() => {
  if (!props.status) return '-'
  return props.status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
})

function formatQty(value) {
  const num = Number(value ?? 0)
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
.ff-print-picking-root {
  display: none;
}

@media print {
  body > #app {
    display: none !important;
  }

  .ff-print-picking-root {
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

.ff-print-picking-root {
  font-family: Arial, Helvetica, sans-serif;
  color: #111827;
  font-size: 9.5px;
  line-height: 1.35;
}

.ff-print-picking-root .pp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #111827;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.ff-print-picking-root .pp-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ff-print-picking-root .pp-subtitle {
  font-size: 11px;
  color: #4b5563;
  margin: 2px 0 0;
}

.ff-print-picking-root .pp-header-right {
  text-align: right;
}

.ff-print-picking-root .pp-company {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.ff-print-picking-root .pp-doc-number {
  font-size: 11px;
  color: #4b5563;
  margin: 2px 0 0;
}

.ff-print-picking-root .pp-meta {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
}

.ff-print-picking-root .pp-meta-col {
  flex: 1;
  min-width: 0;
}

.ff-print-picking-root .pp-meta-row {
  display: flex;
  padding: 1px 0;
}

.ff-print-picking-root .pp-meta-label {
  width: 80px;
  flex-shrink: 0;
  color: #4b5563;
}

.ff-print-picking-root .pp-meta-label::after {
  content: ':';
  margin-left: 4px;
}

.ff-print-picking-root .pp-meta-value {
  font-weight: 600;
}

.ff-print-picking-root .pp-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
}

.ff-print-picking-root .pp-table th,
.ff-print-picking-root .pp-table td {
  border: 1px solid #9ca3af;
  padding: 4px 5px;
  text-align: left;
  vertical-align: top;
}

.ff-print-picking-root .pp-table thead th {
  background: #f3f4f6;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
}

.ff-print-picking-root .pp-table tbody tr {
  break-inside: avoid;
}

.ff-print-picking-root .pp-col-no {
  width: 32px;
  text-align: center;
}

.ff-print-picking-root .pp-col-qty {
  width: 54px;
  text-align: right;
}

.ff-print-picking-root .pp-item-name {
  display: block;
  font-weight: 600;
}

.ff-print-picking-root .pp-item-code {
  display: block;
  color: #4b5563;
  font-size: 10px;
}

.ff-print-picking-root .pp-empty {
  text-align: center;
  color: #6b7280;
  padding: 16px;
}

.ff-print-picking-root .pp-signatures {
  display: flex;
  justify-content: flex-start;
  margin-top: 28px;
  break-inside: avoid;
}

.ff-print-picking-root .pp-signature-box {
  flex: 0 0 45%;
  text-align: center;
}

.ff-print-picking-root .pp-signature-label {
  margin: 0 0 28px;
  font-weight: 600;
}

.ff-print-picking-root .pp-signature-line {
  border-top: 1px solid #111827;
  margin: 0 12px;
}

.ff-print-picking-root .pp-signature-caption {
  margin: 6px 0 0;
  font-size: 9px;
  color: #6b7280;
}

</style>
