# Asset Management Frontend Template

Template frontend Vue 3 untuk dashboard asset management. Project ini sudah berisi layout admin, routing utama, halaman asset, master data, depreciation, import/export, permissions, auth lokal, dan adapter data template tanpa endpoint backend bawaan.

## Stack

- Vue 3 + Vite
- TypeScript
- Tailwind CSS 4
- Vue Router
- ApexCharts

## Persiapan

Gunakan Node.js 20 atau lebih baru.

```bash
npm install
```

Buat file environment dari contoh jika ingin mengganti nama aplikasi:

```bash
cp .env.example .env.development
```

## Menjalankan Project

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview hasil build:

```bash
npm run preview
```

## Struktur Utama

- `src/components/layout` - shell admin, sidebar, header, theme provider.
- `src/components/pages` - halaman utama aplikasi.
- `src/components/dialog` - modal create/update/history.
- `src/components/tables` - tabel data reusable.
- `src/components/forms/FormElements` - field form yang dipakai halaman inti.
- `src/service` - adapter data template dan auth helper lokal.
- `src/router` - daftar route template.
- `src/utils` - formatter dan helper download/activity log.

## Route Aktif

- `/`
- `/asset/fixed`
- `/asset/consumeable`
- `/master/categories`
- `/master/brands`
- `/master/locations`
- `/master/uoms`
- `/master/numbering`
- `/depreciation/policies`
- `/data/import`
- `/data/export`
- `/permissions/list`
- `/permissions/assignments`
- `/signin`
- `/signup`
- `/error-404`

Route demo bawaan template lama sudah dilepas agar starter ini lebih bersih dan siap dipakai sebagai dasar project baru.
