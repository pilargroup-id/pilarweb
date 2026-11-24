# Pilarweb — Company Snapshot & Finance Invoice Grouping (Backend/Database)

## Migration

Jalankan manual:

```bash
sudo mariadb pilarweb < backend/database/migrations/013_request_item_company_invoice_grouping.sql
```

Migration menambah pada `requests`:

```text
item_company_code
item_company_name
invoice_status
```

`company_id/company_name` existing tidak diubah karena field tersebut adalah snapshot company requester dari SSO.

Migration juga membuat:

```text
finance_invoice_groups
finance_invoice_group_requests
```

Membership menggunakan soft removal (`removed_at`, `removal_reason`) agar histori grouping tidak hilang.

## Company Rule

```text
Itembase BU KATO -> KATO / PT Kato Piagam Indonesia
Itembase BU selain KATO -> PNM / PT Pilar Niaga Makmur
```

Untuk PB NORMAL baru, `item_company_code` wajib dikirim saat create dan setiap item diverifikasi ke Itembase detail endpoint. Satu PB tidak boleh berisi mixed company.

## Invoice Rule

Hanya PB NORMAL dengan:

```text
status = COMPLETED
invoice_status = READY_TO_INVOICE
```

yang boleh masuk invoice group.

Satu invoice dapat memiliki satu atau banyak PB. Satu PB hanya boleh memiliki satu membership invoice aktif pada satu waktu. Removal tidak delete row; request kembali `READY_TO_INVOICE`.

## Existing Data

PB lama yang dibuat sebelum fitur ini tetap `invoice_status=NOT_READY` karena belum memiliki `item_company_code/item_company_name`. Backend sengaja tidak menebak company dari `company_name` requester karena maknanya berbeda. Jika PB lama perlu ikut invoice grouping, lakukan backfill company secara terkontrol terlebih dahulu.

## Completion Hooks

PB NORMAL otomatis menjadi `READY_TO_INVOICE` ketika lifecycle benar-benar selesai:

- NON_RETURNABLE: delivery sudah fully resolved.
- RETURNABLE: final return Warehouse sudah selesai.

PB `RETURN_SHORTFALL` tidak dimasukkan ke Invoice Group flow ini.
