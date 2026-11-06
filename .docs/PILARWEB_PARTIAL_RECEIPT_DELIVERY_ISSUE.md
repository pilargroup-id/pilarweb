# Partial Receipt & Delivery Issue — Warehouse Flow

Referensi gabungan untuk dua perilaku warehouse yang saling berkaitan:

1. **Partial Receipt** — requester menerima barang kiriman warehouse lebih sedikit dari yang dikirim.
2. **Delivery Issue** (nama tabel/DB: `delivery_discrepancies`, di-*rename* jadi "Delivery Issue" di UI pada commit `8f89411`) — tindak lanjut atas kekurangan tersebut sampai selesai.

> Catatan istilah: sistem ini bukan PO/supplier goods receipt, melainkan permintaan barang internal (PB). "Partial receipt" di sini = konfirmasi penerimaan oleh **requester** atas kiriman dari **warehouse**, bukan penerimaan warehouse dari supplier.

---

## 1. Entity & Status Overview

| Entity | Tabel | Status |
|---|---|---|
| Fulfillment (proses picking → kirim) | `warehouse_fulfillments` | `PICKING` → `ADMINISTRATIVE_PENDING` / `READY_FOR_DISPATCH` → `DISPATCHED` → `COMPLETED` |
| Delivery Receipt (header penerimaan requester) | `delivery_receipts` | `PENDING` → `PARTIAL` / `RECEIVED` |
| Delivery Receipt Item (baris qty per item) | `delivery_receipt_items` | — (tidak punya status sendiri, qty saja) |
| Delivery Issue / Discrepancy (kekurangan qty) | `delivery_discrepancies` | `OPEN` → `OVERDUE` → `ESCALATED` → `SUPERVISOR_REQUIRED` → `RESOLVED` |
| SLA Violation (audit telat) | `warehouse_sla_violations` | `OPEN` → `RESOLVED` |
| Request (PB) | `requests` | ... → `DISPATCHED` / `PARTIALLY_RECEIVED` → `RECEIVED` → `COMPLETED` |

File kunci:

- `backend/src/services/delivery.service.js` — logic partial receipt + delivery issue
- `backend/src/services/warehouse.service.js` — picking, print DO, resend fulfillment
- `backend/database/migrations/005_fulfillment_delivery.sql` — skema tabel di atas
- `frontend/src/components/dialog/DialogConfirmDelivery.vue` — form "Confirm Receipt"
- `frontend/src/components/dialog/DialogDiscrepancyItems.vue` — form "Delivery Issue" (Resend / Close with Reason)

---

## 2. Rantai Quantity (end-to-end)

```text
requested_qty                        (request_items — diminta requester)
  -> finance_approved_qty_snapshot   (finance menyetujui, bisa dikurangi)
    -> actual_qty                    (warehouse memetik barang saat picking)
      -> dispatched_qty              (= actual_qty, dicatat saat Print DO)
        -> received_qty              (requester konfirmasi terima)
          -> discrepancy_qty / difference_qty = max(0, dispatched_qty - received_qty)
            -> RESEND: jadi requested_qty_snapshot pada fulfillment baru (ulangi dari atas)
            -> CLOSE_WITH_REASON: qty ditutup permanen, tidak ada pengiriman ulang
```

Setiap tahap **tidak menimpa** angka tahap sebelumnya — semua snapshot tersimpan terpisah untuk audit.

---

## 3. Partial Receipt — Alur Detail

### 3.1 Terjadinya (Print DO)

`WarehouseService.printDo()` (`warehouse.service.js:115-118`):

- Fulfillment → `status = 'DISPATCHED'`.
- Membuat 1 baris `delivery_receipts` (`status = 'PENDING'`, `confirmation_deadline_at = NOW() + receipt_confirmation_days_snapshot`).
- Membuat `delivery_receipt_items` per item, `dispatched_qty = actual_qty` hasil picking.
- Request → `status = 'DISPATCHED'` (normal) atau `'PARTIALLY_RECEIVED'` (jika fulfillment ini adalah resend/non-`NORMAL`).

### 3.2 Konfirmasi oleh Requester

`DeliveryService.confirm(user, id, payload)` (`delivery.service.js:76-80`), endpoint `POST /api/delivery/:id/confirm`:

1. Hanya requester pemilik PB yang boleh konfirmasi (`REQUEST_OWNER_REQUIRED`).
2. Receipt harus `PENDING`; kalau sudah lewat `confirmation_deadline_at`, dianggap **auto-accept** (lihat 3.4) — requester tidak bisa lagi submit manual.
3. Receipt yang sudah dikonfirmasi tidak bisa dikonfirmasi ulang (`DELIVERY_RECEIPT_ALREADY_CONFIRMED`).
4. Untuk setiap baris item, requester input `received_qty` (wajib diisi).
5. **Validasi qty:** `received_qty` tidak boleh melebihi `dispatched_qty` → error `RECEIVED_QTY_EXCEEDS_DISPATCHED`.
6. Sistem hitung `discrepancy_qty = max(0, dispatched_qty - received_qty)` per baris.
7. Jika **ada** baris dengan `discrepancy_qty > 0`:
   - Receipt header → `status = 'PARTIAL'`.
   - Request → `status = 'PARTIALLY_RECEIVED'`.
   - **Otomatis membuat baris `delivery_discrepancies`** (`status = 'OPEN'`) untuk tiap baris yang kurang — lihat Bagian 4. Tidak ada tombol "lapor masalah" terpisah; delivery issue selalu lahir dari sini.
8. Jika **semua** baris pas (tidak ada selisih):
   - Receipt → `status = 'RECEIVED'`, Request → `status = 'RECEIVED'`.
   - Langsung panggil `finalizeRequestReceipt()` (lihat 3.5).

### 3.3 Tidak ada flag "partial" manual

Status `PARTIAL` murni **diturunkan** dari perbandingan qty, bukan pilihan user. Requester cukup mengisi angka yang benar-benar diterima; sistem yang menentukan full vs partial.

### 3.4 Auto-Accept (lewat SLA)

`autoAcceptLocked()` / `processDueReceipts()` (`delivery.service.js:72-74`):

- Sweep berjalan untuk semua receipt `PENDING` yang `confirmation_deadline_at` sudah lewat.
- Diperlakukan sebagai **diterima penuh**: `received_qty = dispatched_qty` untuk semua baris, **tidak** membuat delivery issue, langsung `status = 'RECEIVED'`.
- Tercatat sebagai `validation_violations` dengan kode `RECEIPT_AUTO_ACCEPTED` (`ValidationService.recordAutoReceiptViolation`) — jadi tetap ada jejak audit walau requester tidak sempat konfirmasi manual.

### 3.5 Penutupan Request (finalize)

`finalizeRequestReceipt()` (`delivery.service.js:41-66`), dipanggil setelah receipt `RECEIVED` **dan** tidak ada delivery issue yang masih terbuka **dan** tidak ada kiriman lain yang masih pending untuk PB tsb:

- Jumlahkan semua `received_qty` dari seluruh receipt PB.
- Jika `purpose_return_type = 'RETURNABLE'` → buat obligasi `returns` (`status = 'PENDING_REQUESTER'`).
- Jika tidak → Request langsung `status = 'COMPLETED'`.

### 3.6 Business Rules — Partial Receipt

| Aturan | Error code |
|---|---|
| `received_qty` tidak boleh > `dispatched_qty` | `RECEIVED_QTY_EXCEEDS_DISPATCHED` |
| Hanya requester pemilik PB yang boleh konfirmasi | `REQUEST_OWNER_REQUIRED` |
| Receipt hanya bisa dikonfirmasi 1x | `DELIVERY_RECEIPT_ALREADY_CONFIRMED` |
| Lewat deadline → auto-accept, tidak bisa manual lagi | — (otomatis via cron sweep) |

### 3.7 UI

- `DialogConfirmDelivery.vue` — tampilkan Dispatched Qty vs input Received Qty (dibatasi maksimal `dispatched_qty`), kolom "Discrepancy" terhitung live. Tombol **"Confirm Receipt"**.
- `DeliveryTable.vue` — badge status: `PENDING` (warning) / `PARTIAL` (info) / `RECEIVED` (success); tombol "Confirm Receipt" hanya tampil saat `PENDING`; ada countdown ke deadline auto-accept.

---

## 4. Delivery Issue (Discrepancy) — Alur Detail

### 4.1 Pembuatan

Otomatis sebagai efek samping langkah 3.2.7 di atas — satu baris `delivery_discrepancies` per item yang kurang, berisi:

- `expected_qty` (= dispatched_qty), `received_qty`, `difference_qty`
- `status = 'OPEN'`
- Snapshot SLA dari pengaturan request (`resolution_days_snapshot`, `escalation_days_snapshot`, `supervisor_lock_days_snapshot`) → dipakai hitung `resolution_due_at`, `escalation_due_at`, `supervisor_lock_at`.

### 4.2 Status Lifecycle (berbasis waktu, bukan aksi user)

Dihitung ulang setiap kali data dibaca via `refreshDiscrepancyStatuses()` (`delivery.service.js:9-30`):

```text
OPEN
  -> OVERDUE               (lewat resolution_due_at)
    -> ESCALATED            (lewat escalation_due_at)
      -> SUPERVISOR_REQUIRED (lewat supervisor_lock_at)
        -> RESOLVED          (setelah diproses warehouse)
```

Setiap kali status naik ke level "telat" (`OVERDUE`/`ESCALATED`/`SUPERVISOR_REQUIRED`), sistem upsert baris `warehouse_sla_violations` (`violation_type = 'DELIVERY_DISCREPANCY_OVERDUE'`) untuk audit keterlambatan.

### 4.3 Tampilan Grouping per PB

- `listDiscrepancies()` — data mentah per item (untuk `GET /api/warehouse/discrepancies`, dipakai diagnostik).
- `listDiscrepancyForms()` — **dipakai halaman "Delivery Issues"**: mengelompokkan per PB, menampilkan jumlah item bermasalah, total selisih qty, dan status terparah di antara itemnya (prioritas: `SUPERVISOR_REQUIRED` > `ESCALATED` > `OVERDUE` > `OPEN`). Hanya menampilkan PB yang masih punya item `status <> 'RESOLVED'`.

Endpoint: `GET /api/warehouse/discrepancy-forms` (list, support `page`, `limit`, `status`, `search`) dan `GET /api/warehouse/discrepancy-forms/:requestId` (detail 1 PB).

### 4.4 Penyelesaian (Resolve) — satu form per PB

Endpoint: `POST /api/warehouse/discrepancy-forms/:requestId/resolve`
UI: tombol **"Process"** di tabel → `DialogDiscrepancyItems.vue` → **"Submit Resolution"**.

Aturan wajib (`resolveDiscrepancyForm()`, `delivery.service.js:171-245`):

1. **Semua** baris delivery issue yang belum selesai untuk 1 PB **harus** dikirim bersamaan dalam satu request — submit sebagian ditolak (`DISCREPANCY_FORM_INCOMPLETE`).
2. Tiap baris wajib pilih salah satu `resolution_type`: `RESEND` atau `CLOSE_WITH_REASON`.
3. `CLOSE_WITH_REASON` **wajib** mengisi `resolution_note` → tanpa itu error `RESOLUTION_NOTE_REQUIRED`.
4. Jika penyelesaian dilakukan setelah `resolution_due_at` (telat) → wajib isi `late_resolution_reason` (per baris atau satu reason untuk semua baris telat) → tanpa itu error `LATE_RESOLUTION_REASON_REQUIRED`.
5. Jika ada baris berstatus `SUPERVISOR_REQUIRED`, seluruh form hanya bisa disubmit oleh user dengan akses modul `WAREHOUSE_DISCREPANCY_SUPERVISOR` (`access.service.js`) → tanpa itu error `WAREHOUSE_SUPERVISOR_REQUIRED`. Di UI, tombol submit otomatis disabled bila supervisor access tidak dimiliki.
6. Semua baris `RESEND` dalam satu form **harus** 1 PB & 1 departemen warehouse yang sama (`WarehouseService.createResendBatch()`) → error `MIXED_REQUEST_DISCREPANCIES` / `MIXED_WAREHOUSE_DEPARTMENTS` jika tidak.

### 4.5 Efek `RESEND`

- Semua baris `RESEND` dalam satu submit form digabung jadi **satu** `warehouse_fulfillments` baru:
  - `fulfillment_type = 'DISCREPANCY_RESEND'`, `status = 'PICKING'`
  - Qty tiap item = `difference_qty` dari discrepancy terkait.
  - Semua baris resend dalam form ini mendapat `resend_fulfillment_id` yang sama.
- Fulfillment baru ini mengikuti alur fulfillment normal dari awal:
  ```text
  PICKING -> Save Progress -> Source Warehouse + IWT + Actual Qty
          -> READY_FOR_DISPATCH -> Print DO -> DISPATCHED -> Requester confirm (bisa partial lagi, rekursif)
  ```
- Warehouse **tidak bisa mengubah** jumlah resend (sudah fix = `difference_qty`), tapi tetap bisa input `actual_qty` lebih kecil saat picking ulang → kalau requester terima kurang lagi, **delivery issue baru** terbentuk lagi (siklus rekursif, bisa berulang).
- PB tidak berubah — resend tidak membuat PB baru.

### 4.6 Efek `CLOSE_WITH_REASON`

- Tidak membuat fulfillment baru, tidak perlu IWT baru.
- Qty yang kurang dianggap ditutup permanen; `resolution_note` tersimpan sebagai jejak audit alasan penutupan.
- Jika seluruh form isinya `CLOSE_WITH_REASON` saja → `resend_fulfillment_id = null`.

### 4.7 Dampak ke Receipt & Request setelah Resolve

- Untuk tiap receipt terkait: jika sudah tidak ada delivery issue yang `OPEN`/belum resolved, receipt header berubah dari `PARTIAL` → `RECEIVED`.
- `finalizeRequestReceipt()` dipanggil ulang — bisa men-trigger Request jadi `RECEIVED`/`COMPLETED`, atau mulai siklus `returns` bila `RETURNABLE` (lihat Bagian 3.5).

### 4.8 Business Rules — Delivery Issue (ringkasan error code)

| Aturan | Error code |
|---|---|
| Submit form harus lengkap (semua baris belum-selesai) | `DISCREPANCY_FORM_INCOMPLETE` |
| `CLOSE_WITH_REASON` wajib ada catatan | `RESOLUTION_NOTE_REQUIRED` |
| Resolve telat wajib ada alasan keterlambatan | `LATE_RESOLUTION_REASON_REQUIRED` |
| Ada baris `SUPERVISOR_REQUIRED` → wajib akses supervisor | `WAREHOUSE_SUPERVISOR_REQUIRED` |
| Baris `RESEND` campur PB/departemen lain | `MIXED_REQUEST_DISCREPANCIES` / `MIXED_WAREHOUSE_DEPARTMENTS` |

### 4.9 UI

- Menu sidebar **"Delivery Issues"** → route `/warehouse/discrepancies` (sebelumnya berlabel "Delivery Discrepancies", diganti nama tampilan saja di commit `8f89411` — tidak ada perubahan skema/API).
- `DiscrepancyTable.vue` — list per PB, badge: `OPEN` (light), `OVERDUE`/`ESCALATED` (warning), `SUPERVISOR_REQUIRED` (error). Tombol **"Process"**.
- `DialogDiscrepancyItems.vue` — per item: radio **Resend** / **Close with Reason**; textarea catatan wajib kondisional; textarea "Late Resolution Reason" wajib kondisional bila ada item telat; tombol submit disabled jika butuh supervisor tapi user tidak punya akses.

### 4.10 API Endpoint Ringkas

```text
GET  /api/warehouse/discrepancies                        diagnostik, data mentah per item
GET  /api/warehouse/discrepancy-forms                     list PB yang masih ada delivery issue
GET  /api/warehouse/discrepancy-forms/:requestId          detail semua item belum selesai 1 PB
POST /api/warehouse/discrepancy-forms/:requestId/resolve  submit resolusi seluruh form sekaligus
```

> Endpoint lama `POST /api/warehouse/discrepancies/:id/resolve` (resolve per-item) **sudah dihapus** — bisa memicu banyak resend fulfillment dari satu PB. Jangan dipakai lagi di frontend.

---

## 5. Diagram Alur Gabungan

```text
Warehouse Print DO
  -> delivery_receipts (PENDING) + delivery_receipt_items (dispatched_qty)
     |
     v
Requester Confirm Receipt  <-- atau lewat deadline -> Auto-Accept (full, no issue)
     |
     +-- received_qty == dispatched_qty (semua item)
     |     -> Receipt = RECEIVED, Request = RECEIVED -> finalizeRequestReceipt()
     |
     +-- received_qty < dispatched_qty (ada item kurang)
           -> Receipt = PARTIAL, Request = PARTIALLY_RECEIVED
           -> delivery_discrepancies dibuat otomatis (OPEN) per item kurang
                |
                v
           [SLA timer berjalan] OPEN -> OVERDUE -> ESCALATED -> SUPERVISOR_REQUIRED
                |
                v
           Warehouse "Process" (1 form per PB, semua item sekaligus)
                |
                +-- RESEND  -> fulfillment baru (DISCREPANCY_RESEND) -> ulang alur Print DO di atas
                |
                +-- CLOSE_WITH_REASON -> qty ditutup permanen, tidak ada kiriman ulang
                |
           semua item di PB itu RESOLVED
                -> Receipt terkait: PARTIAL -> RECEIVED (jika tidak ada issue tersisa)
                -> finalizeRequestReceipt() dipanggil ulang
```

---

## 6. Alur Terkait: Return Shortfall (bentuk serupa, bonus)

Punya pola "partial receipt" yang sama persis, tapi arahnya kebalik: requester mengembalikan barang ke warehouse.

`backend/src/services/return.service.js`:

1. **Submit** (requester) — `requester_return_qty` per item, dibatasi maksimal `expected_qty` (`RETURN_QTY_EXCEEDS_EXPECTED`). Status `PENDING_REQUESTER` → `SUBMITTED`. Hanya bisa submit 1x (`RETURN_FINAL_CYCLE_ALREADY_SUBMITTED`).
2. **Receive** (warehouse) — catat `warehouse_received_qty` per item, dibatasi maksimal `expected_qty` (`RETURN_RECEIVED_EXCEEDS_EXPECTED`). `shortfall_qty = max(0, expected_qty - warehouse_received_qty)`. Status → `COMPLETED`.
3. Jika ada `shortfall_qty > 0` → otomatis dibuat PB baru (`request_origin = 'RETURN_SHORTFALL'`) meminta sisa barang tsb, plus `validation_violations` kode `RETURN_SHORTFALL` terhadap requester.

UI: `DialogSubmitReturn.vue` (requester), `DialogReceiveReturn.vue` (warehouse — mendukung beberapa kali penerimaan sebagian secara bertahap).

---

## 7. Referensi File

**Backend**
- `backend/src/services/delivery.service.js` — partial receipt (confirm, auto-accept, finalize) & delivery issue (create, status lifecycle, resolve)
- `backend/src/services/warehouse.service.js` — picking, print DO, resend fulfillment batching
- `backend/src/services/return.service.js` — return submit/receive/shortfall
- `backend/src/services/validation.service.js` — pencatatan SLA violation
- `backend/src/controllers/delivery.controller.js`, `warehouse.controller.js`, `return.controller.js`
- `backend/src/routes/delivery.routes.js`, `warehouse.routes.js`, `return.routes.js`
- `backend/database/migrations/005_fulfillment_delivery.sql` — skema fulfillment, delivery_receipts(_items), delivery_discrepancies, sla_violations
- `backend/database/migrations/006_returns_shortfall.sql` — skema returns, return_items
- `backend/database/migrations/001_master_configuration.sql` — default SLA days (`receipt_confirmation_days`, `discrepancy_resolution_days`, `discrepancy_escalation_days`, `discrepancy_supervisor_lock_days`, `return_due_days`)

**Frontend**
- `frontend/src/components/dialog/DialogConfirmDelivery.vue` — form konfirmasi penerimaan (partial receipt)
- `frontend/src/components/tables/DeliveryTable.vue` — daftar kiriman requester
- `frontend/src/components/dialog/DialogDiscrepancyItems.vue` — form resolusi delivery issue
- `frontend/src/components/tables/DiscrepancyTable.vue` — daftar delivery issue per PB
- `frontend/src/components/pages/werehouse/DiscrepancyPage.vue` — halaman "Delivery Issues"
- `frontend/src/components/dialog/DialogSubmitReturn.vue`, `DialogReceiveReturn.vue` — alur return shortfall
- `frontend/src/components/layout/AppSidebar.vue`, `frontend/src/router/index.ts` — menu & route `/warehouse/discrepancies`

Lihat juga `.docs/26-10-22T10_03_00-pilarweb-discrepancy-form-resend.md` untuk detail payload API resolve form, dan `.docs/PILARWEB_BUSINESS_WORKFLOW.md` untuk alur request end-to-end (termasuk shortage saat picking, sebelum tahap delivery).
