import type { ActivityLogRecord } from '@/service/templateApi'

type ActivityRow = Partial<ActivityLogRecord>

const ACTION_VERB_MAP: Record<string, string> = {
  CREATE: 'membuat',
  UPDATE: 'memperbarui',
  ACTIVATE: 'mengaktifkan',
  DEACTIVATE: 'menonaktifkan',
  IMPORT: 'mengimpor',
  EXPORT: 'mengekspor',
  DOWNLOAD_TEMPLATE: 'mengunduh template',
  ASSIGN: 'menetapkan',
  RETURN: 'mengembalikan',
  TRANSFER: 'memindahkan',
  RECEIVE: 'menerima',
  ISSUE: 'mengeluarkan',
  ADJUST: 'menyesuaikan',
  WRITE_OFF: 'menghapusbukukan',
  OPENING_BALANCE: 'mencatat saldo awal',
  MAINTENANCE_CREATE: 'menjadwalkan pemeliharaan',
  MAINTENANCE_COMPLETE: 'menyelesaikan pemeliharaan',
  DEPRECIATION_UPDATE: 'memperbarui penyusutan',
  DEPRECIATION_RECALCULATE: 'menghitung ulang penyusutan',
  PERMISSION_GRANT: 'memberikan izin',
  PERMISSION_REVOKE: 'mencabut izin',
  EXTERNAL_REFERENCE_LINK: 'menautkan referensi eksternal',
  REQUEST_FAILED: 'gagal melakukan permintaan',
  REQUEST_SUBMITTED: 'mengajukan permintaan',
  REQUEST_UPDATED: 'memperbarui permintaan',
  REQUEST_ITEM_ADDED: 'menambahkan item pada permintaan',
  REQUEST_ITEM_UPDATED: 'memperbarui item permintaan',
  REQUEST_ITEM_REMOVED: 'menghapus item permintaan',
  REQUEST_ITEM_CANCELED: 'membatalkan item permintaan',
  DEPARTMENT_APPROVED: 'menyetujui permintaan',
  DEPARTMENT_REJECTED: 'menolak permintaan',
  DEPARTMENT_APPROVAL_REVERTED: 'mengembalikan persetujuan permintaan',
  COMMENT_ADDED: 'menambahkan komentar pada permintaan',
  RETURN_SUBMITTED: 'mengajukan pengembalian untuk',
  RETURN_RECEIVED_BY_WAREHOUSE: 'menerima pengembalian untuk',
  RETURN_INSPECTED: 'memeriksa pengembalian untuk',
  WAREHOUSE_ACCEPTED: 'menerima permintaan gudang untuk',
  PICKING_DOCUMENT_PRINTED: 'mencetak dokumen picking untuk',
  ACTUAL_QTY_UPDATED: 'memperbarui qty aktual untuk',
  PICKING_CONFIRMED: 'mengonfirmasi picking untuk',
  INVENTORY_TRANSFER_RECORDED: 'mencatat transfer inventaris untuk',
  INVENTORY_TRANSFER_UPDATED: 'memperbarui transfer inventaris untuk',
  INVENTORY_TRANSFER_DELETED: 'menghapus transfer inventaris untuk',
  GOODS_HANDED_OVER: 'menyerahkan barang untuk',
  GOODS_RECEIVED: 'menerima barang untuk',
  INVENTORY_ADJUSTMENT_BATCH_GENERATED: 'membuat batch penyesuaian inventaris untuk',
  FINANCE_REVIEW_APPROVED: 'menyetujui review finance untuk',
  FINANCE_REVIEW_REJECTED: 'menolak review finance untuk',
  FINANCE_REVIEW_CANCELED: 'membatalkan review finance untuk',
}

export function actorName(row: ActivityRow): string {
  return row.user_name_snapshot || row.username_snapshot || 'Sistem'
}

export function actionVerb(row: ActivityRow): string {
  const action = row.action || ''
  return ACTION_VERB_MAP[action] || action.toLowerCase().replace(/_/g, ' ') || 'melakukan aksi'
}

export function activityTarget(row: ActivityRow): string {
  return row.entity_name_snapshot || row.entity_reference || row.entity_type || row.module || ''
}

export function describeActivity(row: ActivityRow): string {
  const target = activityTarget(row)
  return target ? `${actionVerb(row)} ${target}` : actionVerb(row)
}

export function initials(name: string): string {
  return (name || '').trim().charAt(0).toUpperCase() || '?'
}
