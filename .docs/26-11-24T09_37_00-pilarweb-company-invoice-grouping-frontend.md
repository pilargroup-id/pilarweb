# Pilarweb — Company Filter & Finance Invoice Grouping (Frontend)

## 1. Company pada Form PB

Field **Company** tetap disimpan sebagai snapshot transaksi, tetapi kebutuhan utama di form adalah untuk memfilter item yang dapat dipilih requester.

### Mapping

| Company | Itembase Business Unit |
| --- | --- |
| PT Kato Piagam Indonesia | `business_unit.code === "KATO"` |
| PT Pilar Niaga Makmur | `business_unit.code !== "KATO"` |

### Item endpoint

```http
GET /api/item/items
```

Response Itembase diteruskan oleh Pilarweb. FE menggunakan `item.business_unit.code` untuk filtering list item.

### Create PB

```http
POST /api/requests
```

Tambahkan field:

```json
{
  "item_company_code": "KATO",
  "request_purpose_id": 1,
  "target_department_id": 8,
  "reason": "Keperluan operasional",
  "items": [
    {
      "itembase_item_id": "uuid-item",
      "requested_qty": 2
    }
  ]
}
```

Nilai yang valid:

```text
KATO = PT Kato Piagam Indonesia
PNM = PT Pilar Niaga Makmur
```

Backend memvalidasi Business Unit setiap item ke Itembase. Satu PB tidak boleh berisi campuran company.

`item_company_code` tidak dapat diganti setelah PB dibuat. Jika company salah, requester perlu membuat PB baru.

> `requests.company_id/company_name` tetap berarti company requester dari SSO. Jangan gunakan field itu sebagai company barang.

Field snapshot barang yang baru:

```text
item_company_code
item_company_name
```

---

## 2. Invoice Status

Request mempunyai `invoice_status`:

```text
NOT_READY
READY_TO_INVOICE
INVOICED
```

Lifecycle:

```text
PB belum selesai          -> NOT_READY
PB NORMAL selesai penuh   -> READY_TO_INVOICE
Masuk invoice group       -> INVOICED
Dikeluarkan dari invoice  -> READY_TO_INVOICE
```

Status utama PB tetap `COMPLETED`; `invoice_status` adalah status administrasi Finance yang terpisah.

---

## 3. List PB yang Siap Dijadikan Invoice

```http
GET /api/finance/invoice-groups/eligible-requests
```

Query opsional:

```text
company_code=KATO|PNM
search=PB.../requester/purpose
page=1
limit=20
```

Hanya PB dengan kondisi berikut yang keluar:

```text
request_origin = NORMAL
status = COMPLETED
invoice_status = READY_TO_INVOICE
item company snapshot tersedia
```

---

## 4. Create Invoice Group

Satu invoice boleh berisi **1 PB atau banyak PB**.

```http
POST /api/finance/invoice-groups
```

Contoh 1 invoice = 1 PB:

```json
{
  "invoice_number": "INV-2611-001",
  "request_ids": ["request-uuid-a"],
  "note": "Optional"
}
```

Contoh 1 invoice = banyak PB:

```json
{
  "invoice_number": "INV-2611-002",
  "request_ids": [
    "request-uuid-a",
    "request-uuid-b",
    "request-uuid-c"
  ]
}
```

Semua PB harus:

- `COMPLETED`
- `READY_TO_INVOICE`
- berasal dari company yang sama
- belum berada pada invoice aktif lain

Setelah sukses, semua PB berubah menjadi `INVOICED`.

---

## 5. Invoice Group List & Detail

```http
GET /api/finance/invoice-groups
GET /api/finance/invoice-groups/:id
```

Filter list:

```text
company_code=KATO|PNM
search=<invoice number>
```

Detail mengembalikan:

```text
requests          = PB yang masih aktif di invoice
removed_requests  = histori PB yang pernah dikeluarkan
```

---

## 6. Tambah PB ke Invoice yang Sudah Ada

```http
POST /api/finance/invoice-groups/:id/requests
```

Body:

```json
{
  "request_ids": ["request-uuid-d"]
}
```

Company PB harus sama dengan company invoice group.

---

## 7. Remove / Unassign PB dari Invoice

Istilah UI yang disarankan: **Remove from Invoice**.

```http
POST /api/finance/invoice-groups/:id/requests/:requestId/remove
```

Body:

```json
{
  "reason": "PB salah dimasukkan ke invoice ini"
}
```

`reason` wajib.

Backend tidak menghapus histori membership. Backend menyimpan:

```text
removed_at
removed_by_user_id
removed_by_name
removal_reason
```

Setelah PB dikeluarkan:

```text
INVOICED -> READY_TO_INVOICE
```

PB tersebut kemudian bisa dimasukkan ke invoice lain atau dibuat invoice sendiri.

---

## 8. Finance Queue/History

Endpoint existing Finance sekarang juga mengembalikan:

```text
item_company_code
item_company_name
invoice_status
```

Dan mendukung filter `company_code`. Finance History juga mendukung `invoice_status`.

Frontend jangan derive company dari `requests.company_name`, karena itu adalah company requester dari SSO. Gunakan `item_company_code/item_company_name` untuk kebutuhan company barang/invoice.
