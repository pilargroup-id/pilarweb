# Pilarweb — Finance Reject PB & Warehouse Unable to Fulfill

## Tujuan

Dokumen ini menjelaskan perubahan backend untuk dua action baru:

1. Finance dapat menolak seluruh PB langsung tanpa input keputusan per item.
2. Warehouse dapat menandai fulfillment sebagai tidak dapat dipenuhi dan mengembalikan PB ke Finance Review.

Dokumen ini ditujukan untuk integrasi Frontend.

---

## 1. Finance — Reject Entire PB

### Endpoint

```http
POST /api/finance/requests/:requestId/reject
```

### Authorization

User harus memiliki akses Finance sesuai capability/backend authorization yang sudah berlaku.

### Request Body

```json
{
  "reason": "Budget tidak disetujui"
}
```

`reason` wajib diisi.

### Behavior Backend

Ketika endpoint berhasil:

- Semua item pada Finance Review otomatis menjadi `REJECTED`.
- `approved_qty` menjadi `0`.
- `rejected_qty` menjadi seluruh quantity yang diminta.
- Finance Review menjadi `REJECTED`.
- Request/PB menjadi `REJECTED`.
- `completed_at` diisi otomatis oleh backend.

Frontend tidak perlu lagi membentuk payload keputusan per item apabila Finance ingin menolak seluruh PB.

### Rekomendasi UI

Pada halaman Finance Review sediakan dua action terpisah:

```text
Submit Review
Reject PB
```

`Submit Review` tetap dipakai untuk kondisi approve/reject per item.

`Reject PB` dipakai jika seluruh PB ingin ditolak langsung.

Sebelum submit, tampilkan confirmation dialog dan wajibkan alasan penolakan.

Contoh:

```text
Reject PB PB261100031?

Reason:
[________________________________]

[Cancel] [Reject PB]
```

---

## 2. Warehouse — Unable to Fulfill

### Endpoint

```http
POST /api/warehouse/fulfillments/:fulfillmentId/unable-to-fulfill
```

### Authorization

User harus memiliki akses Warehouse sesuai capability/backend authorization yang sudah berlaku.

### Request Body

```json
{
  "reason": "Stock seluruh item tidak tersedia"
}
```

`reason` wajib diisi.

### Fulfillment yang Diizinkan

Action ini hanya berlaku untuk fulfillment:

```text
fulfillment_mode = PHYSICAL
fulfillment_type = NORMAL
status           = PICKING
```

Action ini tidak digunakan untuk:

```text
DISCREPANCY_RESEND
RETURN_SHORTFALL_CONVERSION
READY_FOR_DISPATCH
DISPATCHED
```

### Behavior Backend

Jika Warehouse memilih `Unable to Fulfill`:

```text
Fulfillment PICKING
        ↓
UNABLE_TO_FULFILL
        ↓
PB → PENDING_FINANCE_REVIEW
        ↓
PB masuk kembali ke Finance Queue
```

Fulfillment lama tidak dihapus. Fulfillment tetap tersimpan sebagai histori dengan status:

```text
UNABLE_TO_FULFILL
```

Backend juga menyimpan informasi audit:

```text
unable_reason
unable_by_user_id
unable_by_name
unable_at
```

Finance kemudian dapat:

```text
- melakukan Finance Review ulang; atau
- Reject PB langsung menggunakan endpoint Finance Reject PB.
```

Jika Finance melakukan approval kembali, backend akan membuat fulfillment baru. Fulfillment sebelumnya tetap menjadi histori.

### Rekomendasi UI

Pada fulfillment dengan status `PICKING`, tambahkan action:

```text
Unable to Fulfill
```

Contoh:

```text
[Save Progress]
[Complete Picking]
[Unable to Fulfill]
```

Saat dipilih, tampilkan dialog:

```text
Unable to Fulfill

PB: PB261100031
Fulfillment: FUL261100030

Reason:
[________________________________]

[Cancel] [Confirm Unable to Fulfill]
```

Reason wajib sebelum tombol confirm aktif.

---

## 3. Perbedaan Finance Reject vs Warehouse Unable to Fulfill

### Finance Reject PB

Makna bisnis:

```text
Finance tidak menyetujui permintaan.
```

Hasil akhir:

```text
PB → REJECTED
```

### Warehouse Unable to Fulfill

Makna bisnis:

```text
PB sudah disetujui Finance,
tetapi Warehouse tidak dapat menjalankan fulfillment.
```

Hasil:

```text
Fulfillment → UNABLE_TO_FULFILL
PB          → PENDING_FINANCE_REVIEW
```

Jadi Frontend jangan menyamakan `Unable to Fulfill` dengan `Reject PB`.

---

## 4. Frontend Integration Notes

Frontend sebaiknya mengikuti status/capability dari backend dan tidak membuat rule berdasarkan department secara hardcode.

Finance:

```text
PENDING_FINANCE_REVIEW
→ tampilkan Finance Review
→ tampilkan Reject PB
```

Warehouse:

```text
PICKING + NORMAL + PHYSICAL
→ tampilkan Unable to Fulfill
```

Setelah action berhasil, refresh detail PB/fulfillment dan queue terkait dari API agar status terbaru langsung tampil.

---

## 5. Database Migration

Backend patch menggunakan migration:

```text
backend/database/migrations/012_finance_reject_warehouse_unable.sql
```

Migration menambahkan field audit pada fulfillment:

```text
unable_reason
unable_by_user_id
unable_by_name
unable_at
```

Tidak ada perubahan yang perlu dilakukan Frontend pada database secara langsung.
