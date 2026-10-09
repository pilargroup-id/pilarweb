# Pilarweb Frontend Guide - Warehouse Picking & Shortage

Dokumen ini adalah kontrak frontend untuk proses **Warehouse Fulfillment / Picking**, khususnya input `actual_qty`, shortage, dan remainder action.

Backend saat ini hanya menerima shortage reason berikut:

```text
STOCK_SHORTAGE
DAMAGED
NOT_FOUND
OTHER
```

Frontend **jangan mengirim value lama** seperti `OUT_OF_STOCK` atau `INSUFFICIENT_STOCK`.

---

## 1. Endpoint Update Picking Item

Gunakan endpoint:

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/items/:fulfillmentItemId
Authorization: Bearer <PILARGROUP_JWT>
Content-Type: application/json
```

Contoh URL:

```http
PUT /api/warehouse/fulfillments/12/items/31
```

Endpoint ini hanya bisa digunakan ketika fulfillment masih berstatus:

```text
PICKING
```

Kalau fulfillment sudah bukan `PICKING`, backend akan menolak perubahan actual quantity.

---

## 2. Quantity yang Harus Ditampilkan FE

Untuk setiap fulfillment item, FE minimal menampilkan:

```text
Requested Qty
Finance Approved Qty
Actual Qty
Shortage Qty
Shortage Reason
Remaining Qty Action
Shortage Note
```

Penting:

```text
Requested Qty
```

adalah quantity awal yang diminta requester.

```text
Finance Approved Qty
```

adalah quantity yang disetujui Finance dan menjadi batas maksimal Warehouse.

```text
Actual Qty
```

adalah quantity fisik yang benar-benar berhasil dipick Warehouse.

```text
Shortage Qty
```

dihitung backend:

```text
Shortage Qty = Finance Approved Qty - Actual Qty
```

FE tidak perlu mengirim `shortage_qty`.

---

## 3. Full Fulfillment - Tidak Ada Shortage

Contoh:

```text
Finance Approved Qty : 8
Actual Qty           : 8
Shortage Qty         : 0
```

Payload:

```json
{
  "actual_qty": 8
}
```

Dalam kondisi ini:

```text
shortage_reason_code = null
remainder_disposition = NONE
```

Backend akan otomatis membersihkan shortage reason dan mengatur disposition menjadi `NONE`.

### FE behavior

Jika:

```text
actual_qty === finance_approved_qty_snapshot
```

maka hide/disable:

- Shortage Reason
- Remaining Qty Action
- Shortage Note

FE tidak perlu meminta user mengisi field shortage.

---

## 4. Partial Fulfillment - Ada Shortage

Contoh:

```text
Finance Approved Qty : 8
Actual Qty           : 5
Shortage Qty         : 3
```

Karena ada shortage, FE **wajib** mengirim:

```text
shortage_reason_code
remainder_disposition
```

Contoh payload:

```json
{
  "actual_qty": 5,
  "shortage_reason_code": "STOCK_SHORTAGE",
  "remainder_disposition": "BACKORDER_REMAINDER",
  "shortage_note": "3 units are currently unavailable"
}
```

---

## 5. Shortage Reason Enum

Backend hanya menerima value berikut.

| API Value | Label FE | Kapan digunakan |
|---|---|---|
| `STOCK_SHORTAGE` | Stock Shortage | Stok tidak cukup untuk memenuhi Finance Approved Qty. Termasuk kondisi stock habis atau stock hanya tersedia sebagian. |
| `DAMAGED` | Damaged | Barang tersedia tetapi rusak/tidak layak untuk dipick. |
| `NOT_FOUND` | Not Found | Barang secara sistem seharusnya ada, tetapi tidak ditemukan secara fisik saat picking. |
| `OTHER` | Other | Alasan lain yang tidak termasuk tiga kategori di atas. |

Recommended FE constant:

```js
const SHORTAGE_REASONS = [
  { value: 'STOCK_SHORTAGE', label: 'Stock Shortage' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NOT_FOUND', label: 'Not Found' },
  { value: 'OTHER', label: 'Other' },
];
```

### Jangan gunakan

Frontend jangan lagi mengirim:

```text
OUT_OF_STOCK
INSUFFICIENT_STOCK
```

Keduanya sudah digabung menjadi:

```text
STOCK_SHORTAGE
```

---

## 6. Remaining Qty Action / Remainder Disposition

Jika ada shortage, FE wajib menentukan apa yang terjadi pada sisa quantity.

Backend menerima:

```text
BACKORDER_REMAINDER
CLOSE_SHORT
```

Selain itu backend memiliki internal/default value:

```text
NONE
```

Tetapi `NONE` hanya valid jika tidak ada shortage.

Recommended FE options:

```js
const REMAINDER_ACTIONS = [
  {
    value: 'BACKORDER_REMAINDER',
    label: 'Keep as Backorder',
  },
  {
    value: 'CLOSE_SHORT',
    label: 'Close Remaining Qty',
  },
];
```

### BACKORDER_REMAINDER

Gunakan jika sisa quantity masih akan dipenuhi di fulfillment berikutnya.

Contoh:

```text
Finance Approved : 10
Actual Picked    : 7
Shortage         : 3
Action           : BACKORDER_REMAINDER
```

Meaning:

```text
7 unit lanjut ke Inventory Transfer / Handover.
3 unit tetap outstanding dan dapat dipenuhi kemudian.
```

### CLOSE_SHORT

Gunakan jika sisa quantity tidak akan dipenuhi lagi.

Contoh:

```text
Finance Approved : 10
Actual Picked    : 7
Shortage         : 3
Action           : CLOSE_SHORT
```

Meaning:

```text
7 unit dilanjutkan.
3 unit ditutup dan tidak menjadi outstanding fulfillment berikutnya.
```

---

## 7. Recommended Form Behavior

Untuk row item:

```text
Finance Approved Qty : 10
Actual Qty            : [ 7 ]
```

FE menghitung preview shortage secara lokal:

```text
previewShortage = financeApprovedQty - actualQty
```

Jika hasil:

```text
previewShortage > 0
```

show:

```text
Shortage Qty          : 3
Shortage Reason       : [ Stock Shortage v ]
Remaining Qty Action  : [ Keep as Backorder v ]
Shortage Note         : [ optional textarea ]
```

Jika:

```text
previewShortage === 0
```

hide shortage inputs.

---

## 8. Validation Rules FE

Sebelum submit update item:

### Actual Qty

```text
actual_qty >= 0
actual_qty <= finance_approved_qty_snapshot
```

FE jangan izinkan quantity lebih besar dari Finance Approved Qty.

### Jika Shortage > 0

Required:

```text
shortage_reason_code
remainder_disposition
```

Optional:

```text
shortage_note
```

### Jika Reason = OTHER

Recommended FE behavior: jadikan `shortage_note` required di client-side agar alasan `OTHER` tidak kosong secara konteks.

Catatan: ini recommendation UI. Backend saat ini memperlakukan `shortage_note` sebagai optional.

---

## 9. Payload Examples

### A. Full quantity

Finance approved 5, picked 5:

```json
{
  "actual_qty": 5
}
```

### B. Stock shortage - backorder

Finance approved 10, picked 7:

```json
{
  "actual_qty": 7,
  "shortage_reason_code": "STOCK_SHORTAGE",
  "remainder_disposition": "BACKORDER_REMAINDER",
  "shortage_note": "Remaining stock expected next week"
}
```

### C. Damaged - close remaining

```json
{
  "actual_qty": 3,
  "shortage_reason_code": "DAMAGED",
  "remainder_disposition": "CLOSE_SHORT",
  "shortage_note": "2 units damaged during warehouse inspection"
}
```

### D. Item not found

```json
{
  "actual_qty": 0,
  "shortage_reason_code": "NOT_FOUND",
  "remainder_disposition": "BACKORDER_REMAINDER",
  "shortage_note": "Physical stock is still being checked"
}
```

### E. Other

```json
{
  "actual_qty": 4,
  "shortage_reason_code": "OTHER",
  "remainder_disposition": "CLOSE_SHORT",
  "shortage_note": "Item reserved for another operational requirement"
}
```

---

## 10. Common Backend Errors

### Invalid shortage reason

```text
shortage_reason_code must be one of: STOCK_SHORTAGE, DAMAGED, NOT_FOUND, OTHER
```

Cause:

FE mengirim value di luar enum yang diizinkan.

Correct values:

```text
STOCK_SHORTAGE
DAMAGED
NOT_FOUND
OTHER
```

### Missing remainder action

```text
remainder_disposition must be BACKORDER_REMAINDER or CLOSE_SHORT when shortage exists
```

Cause:

`actual_qty` lebih kecil dari Finance Approved Qty tetapi FE tidak mengirim disposition yang valid.

### Actual qty exceeds approved qty

Backend error code:

```text
ACTUAL_QTY_EXCEEDS_APPROVED
```

Cause:

```text
actual_qty > finance_approved_qty_snapshot
```

### Fulfillment no longer editable

Backend error code:

```text
FULFILLMENT_NOT_PICKING
```

Cause:

Fulfillment sudah keluar dari status `PICKING`.

FE harus disable editing ketika fulfillment bukan `PICKING`.

---

## 11. Confirm Picking

Setelah semua item selesai diinput:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/confirm-picking
Authorization: Bearer <PILARGROUP_JWT>
```

Sebelum enable tombol **Confirm Picking**, FE sebaiknya memastikan setiap item sudah resolved.

Untuk setiap item:

```text
Finance Approved Qty
=
Actual Qty + Shortage Qty
```

Jika ada shortage:

```text
shortage_reason_code must exist
remainder_disposition must be BACKORDER_REMAINDER or CLOSE_SHORT
```

Jika actual quantity ada, flow berikutnya adalah:

```text
PENDING_INVENTORY_TRANSFER
```

Kemudian Warehouse membuat NetSuite Inventory Transfer sebelum handover.

---

## 12. Suggested UI Labels

Recommended production labels:

```text
Finance Approved Qty
Actual Qty
Shortage Qty
Shortage Reason
Remaining Qty Action
Shortage Note
```

Untuk dropdown `Remaining Qty Action`, gunakan label user-friendly:

```text
Keep as Backorder
Close Remaining Qty
```

Jangan gunakan label `Reminder` karena field tersebut bukan reminder. Field tersebut menentukan treatment terhadap remaining quantity.

---

## 13. FE Implementation Summary

Contract yang harus dipegang FE:

```text
If Actual Qty == Finance Approved Qty
  -> no shortage fields
  -> backend stores reason NULL
  -> disposition NONE

If Actual Qty < Finance Approved Qty
  -> shortage exists
  -> Shortage Reason REQUIRED
  -> Remaining Qty Action REQUIRED
```

Allowed Shortage Reason:

```text
STOCK_SHORTAGE
DAMAGED
NOT_FOUND
OTHER
```

Allowed Remaining Qty Action when shortage exists:

```text
BACKORDER_REMAINDER
CLOSE_SHORT
```

Never send:

```text
OUT_OF_STOCK
INSUFFICIENT_STOCK
```

Both concepts are represented by:

```text
STOCK_SHORTAGE
```
