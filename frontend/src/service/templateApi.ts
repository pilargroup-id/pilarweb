type AnyRecord = Record<string, any>

export interface AssetListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  category_id?: number | string
  location_id?: number | string
}

export interface AssetListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AssetRecord extends AnyRecord {
  id: number
  asset_number: string
  asset_name: string
  category_id: number
  status: string
  asset_condition: string
}

export interface AssetListResponse {
  success: boolean
  message: string
  data: AssetRecord[]
  meta: AssetListMeta
}

export interface AssetResponse {
  success: boolean
  message: string
  data: AssetRecord
}

export interface ConsumableRecord extends AnyRecord {
  id: number
  consumable_code: string
  name: string
  category_id: number
  uom_id: number
  minimum_stock: number | string
}

export interface ConsumableListResponse {
  success: boolean
  message: string
  data: ConsumableRecord[]
  meta: AssetListMeta
}

export interface ConsumableResponse {
  success: boolean
  message: string
  data: ConsumableRecord
}

export interface MasterDataRecord extends AnyRecord {
  id: number | string
  code?: string | null
  name?: string
}

export interface MasterDataListResponse {
  success: boolean
  message: string
  data: MasterDataRecord[]
}

export interface MasterDataResponse {
  success: boolean
  message: string
  data: MasterDataRecord
}

export interface NumberingConfigRecord extends AnyRecord {
  id: number
  managing_department_id: string
  sequence_type: string
  name: string
  pattern: string
  sequence_length: number
  starting_sequence: number
  current_sequence: number
}

export interface NumberingConfigListResponse {
  success: boolean
  message: string
  data: NumberingConfigRecord[]
}

export interface NumberingConfigResponse {
  success: boolean
  message: string
  data: NumberingConfigRecord
}

export interface PermissionRecord extends AnyRecord {
  id: number
  code: string
  name: string
}

export interface PermissionListResponse {
  success: boolean
  message: string
  data: PermissionRecord[]
}

export interface PermissionAssignmentRecord extends AnyRecord {
  id: number
  permission_id: number
  permission_code: string
  permission_name: string
  subject_type: 'USER' | 'COMPANY' | 'DEPARTMENT'
  subject_id: string
  access_scope_type: 'GLOBAL' | 'COMPANY' | 'DEPARTMENT'
  access_scope_id: string | null
}

export interface PermissionAssignmentListParams extends AnyRecord {}

export interface PermissionAssignmentListResponse {
  success: boolean
  message: string
  data: PermissionAssignmentRecord[]
}

export interface PermissionAssignmentResponse {
  success: boolean
  message: string
  data: PermissionAssignmentRecord
}

export interface DirectoryRecord extends AnyRecord {
  id: string | number
  name?: string
  full_name?: string
  display_name?: string
  department_name?: string
  company_name?: string
  username?: string
  email?: string
}

export interface DirectoryListResponse {
  success: boolean
  message: string
  data: DirectoryRecord[]
}

export interface ChatUserRecord {
  _id: string
  username: string
  avatar: string
  status: { state: 'online' | 'offline'; lastChanged: string }
}

export interface ChatMessageFileRecord {
  name: string
  size?: number
  type: string
  extension?: string
  url: string
  localUrl?: string
}

export interface ChatMessageRecord extends AnyRecord {
  _id: string
  senderId: string
  content: string
  date: string
  timestamp: string
  saved?: boolean
  distributed?: boolean
  seen?: boolean
  files?: ChatMessageFileRecord[]
  replyMessage?: AnyRecord
}

export interface ChatRoomRecord extends AnyRecord {
  roomId: string
  roomName: string
  avatar: string
  users: ChatUserRecord[]
  unreadCount?: number
  index?: string
  lastMessage?: AnyRecord
}

export interface ChatRoomListResponse {
  success: boolean
  message: string
  data: ChatRoomRecord[]
}

export interface ChatRoomResponse {
  success: boolean
  message: string
  data: ChatRoomRecord
}

export interface ChatMessageListResponse {
  success: boolean
  message: string
  data: ChatMessageRecord[]
}

export interface ChatMessageResponse {
  success: boolean
  message: string
  data: ChatMessageRecord
}

export interface DashboardResponse {
  success: boolean
  message: string
  data: {
    assets: { total: number; by_status: Record<string, number> } | null
    consumables: {
      total_masters: number
      low_stock: Array<{
        id: number
        consumable_code: string
        name: string
        minimum_stock: number | string
        total_stock: number | string
      }>
    } | null
  }
}

export interface ActivityLogParams extends AnyRecord {
  page?: number
  limit?: number
}

export interface ActivityLogRecord extends AnyRecord {
  id: number
  module: string
  action: string
  source: string
  status: 'SUCCESS' | 'FAILED'
  created_at: string
}

export interface ActivityLogListResponse {
  success: boolean
  message: string
  data: ActivityLogRecord[]
  meta: AssetListMeta
}

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'MANUAL'
export type SalvageValueType = 'FIXED' | 'PERCENT'

export interface DepreciationPolicyRecord extends AnyRecord {
  id: number
  managing_department_id?: string
  name?: string
  method?: DepreciationMethod
  useful_life_months?: number
  salvage_value_type?: SalvageValueType
  salvage_value: number | string
}

export interface DepreciationPolicyListResponse {
  success: boolean
  message: string
  data: DepreciationPolicyRecord[]
}

export interface DepreciationPolicyResponse {
  success: boolean
  message: string
  data: DepreciationPolicyRecord
}

export interface CategoryDepreciationDefaultPayload extends AnyRecord {}
export interface CategoryDepreciationDefaultRecord extends AnyRecord {}

export interface CategoryDepreciationDefaultResponse {
  success: boolean
  message: string
  data: CategoryDepreciationDefaultRecord
}

export interface DepreciationSuggestionResponse {
  success: boolean
  message: string
  data: CategoryDepreciationDefaultRecord | null
}

export interface AssetDepreciationConfigRecord extends AnyRecord {
  id: number
  asset_id: number
  purchase_cost_snapshot: number | string
  depreciation_method: DepreciationMethod
  useful_life_months: number
  salvage_value_type: SalvageValueType
  salvage_value: number | string
  depreciation_start_date: string
}

export interface AssetDepreciationLedgerRecord extends AnyRecord {
  id: number
  asset_id: number
  period_year: number
  period_month: number
  opening_book_value: number | string
  depreciation_amount: number | string
  accumulated_depreciation: number | string
  closing_book_value: number | string
}

export interface AssetDepreciationRevisionRecord extends AnyRecord {
  id: number
  asset_id: number
  effective_date: string
  reason: string
  changed_by: string
}

export interface AssetDepreciationResponse {
  success: boolean
  message: string
  data: {
    asset: AssetRecord
    config: AssetDepreciationConfigRecord | null
    revisions: AssetDepreciationRevisionRecord[]
    ledger: AssetDepreciationLedgerRecord[]
  }
}

export interface AssetDepreciationConfigResponse {
  success: boolean
  message: string
  data: AssetDepreciationConfigRecord
}

export interface AssetDepreciationLedgerListResponse {
  success: boolean
  message: string
  data: AssetDepreciationLedgerRecord[]
}

export interface FinalizeDepreciationResponse {
  success: boolean
  message: string
  data: { finalized: boolean; period_year: number; period_month: number }
}

export interface AssetHistoryResponse {
  success: boolean
  message: string
  data: {
    asset: AssetRecord
    history: AnyRecord[]
    assignments: AnyRecord[]
    transfers: AnyRecord[]
    maintenances: AnyRecord[]
    external_references: AnyRecord[]
  }
}

export interface AssetAssignmentResponse {
  success: boolean
  message: string
  data: AnyRecord
}

export interface AssetMaintenanceResponse {
  success: boolean
  message: string
  data: AnyRecord
}

export interface AssetTransferResponse {
  success: boolean
  message: string
  data: AssetRecord
}

export type ImportType =
  | 'ASSET'
  | 'CONSUMABLE'
  | 'CONSUMABLE_OPENING_STOCK'
  | 'CATEGORY'
  | 'LOCATION'
  | 'VENDOR'
  | 'BRAND'
  | 'MODEL'
  | 'DEPRECIATION_POLICY'

export interface ImportPreviewResponse {
  success: boolean
  message: string
  data: AnyRecord
}

export interface ImportCommitResponse {
  success: boolean
  message: string
  data: AnyRecord
}

export interface DownloadedFile {
  blob: Blob
  filename: string
}

export type ExportType =
  | 'ASSET_LIST'
  | 'ASSIGNMENTS'
  | 'TRANSFERS'
  | 'MAINTENANCE'
  | 'DEPRECIATION'
  | 'CONSUMABLE_STOCK'
  | 'CONSUMABLE_MOVEMENTS'
  | 'CONSUMABLE_USAGE'
  | 'ACTIVITY_LOG'

export interface ExportedFile extends DownloadedFile {
  rowCount: number | null
}

const today = new Date().toISOString().slice(0, 10)

const masterData: Record<string, MasterDataRecord[]> = {
  categories: [
    { id: 1, code: 'LAPTOP', name: 'Laptop', tracking_type: 'SERIALIZED_ASSET', is_depreciable: true, is_active: true },
    { id: 2, code: 'FURNITURE', name: 'Furniture', tracking_type: 'SERIALIZED_ASSET', is_depreciable: true, is_active: true },
    { id: 3, code: 'SUPPLY', name: 'Office Supply', tracking_type: 'CONSUMABLE', is_depreciable: false, is_active: true },
  ],
  brands: [
    { id: 1, name: 'Dell', is_active: true },
    { id: 2, name: 'Lenovo', is_active: true },
    { id: 3, name: 'IKEA', is_active: true },
  ],
  models: [
    { id: 1, brand_id: 1, name: 'Latitude 5440', is_active: true },
    { id: 2, brand_id: 2, name: 'ThinkPad T14', is_active: true },
  ],
  locations: [
    { id: 1, code: 'HQ-01', name: 'Head Office', location_type: 'OFFICE', is_active: true },
    { id: 2, code: 'WH-01', name: 'Warehouse', location_type: 'WAREHOUSE', is_active: true },
  ],
  vendors: [
    { id: 1, code: 'VND-001', name: 'Template Vendor', is_active: true },
  ],
  uoms: [
    { id: 1, code: 'PCS', name: 'Pieces', is_active: true },
    { id: 2, code: 'BOX', name: 'Box', is_active: true },
  ],
}

const directory = {
  users: [
    { id: 'u-001', name: 'Template User', username: 'template.user', email: 'template@example.com' },
    { id: 'u-002', name: 'Finance Reviewer', username: 'finance.reviewer', email: 'finance@example.com' },
  ],
  departments: [
    { id: 'dept-it', name: 'Information Technology', department_name: 'Information Technology' },
    { id: 'dept-fin', name: 'Finance', department_name: 'Finance' },
  ],
  companies: [
    { id: 'company-main', name: 'Template Company', company_name: 'Template Company' },
  ],
}

function chatAvatar(name: string, background: string): string {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="60" fill="${background}"/><text x="50%" y="52%" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const CHAT_CURRENT_USER_ID = 'u-001'
export const AI_BOT_USER_ID = 'ai-assistant'

const chatUsers: Record<string, ChatUserRecord> = {
  'u-001': {
    _id: 'u-001',
    username: 'Template User',
    avatar: chatAvatar('Template User', '#465FFF'),
    status: { state: 'online', lastChanged: 'now' },
  },
  'ai-assistant': {
    _id: 'ai-assistant',
    username: 'AI Assistant',
    avatar: chatAvatar('AI Assistant', '#7A5AF8'),
    status: { state: 'online', lastChanged: 'now' },
  },
}

const chatRooms: ChatRoomRecord[] = [
  {
    roomId: 'room-ai-1',
    roomName: 'Cara Input Aset Baru',
    avatar: chatUsers[AI_BOT_USER_ID].avatar,
    users: [chatUsers[CHAT_CURRENT_USER_ID], chatUsers[AI_BOT_USER_ID]],
    unreadCount: 0,
    index: '1',
  },
  {
    roomId: 'room-ai-2',
    roomName: 'Kebijakan Depresiasi',
    avatar: chatUsers[AI_BOT_USER_ID].avatar,
    users: [chatUsers[CHAT_CURRENT_USER_ID], chatUsers[AI_BOT_USER_ID]],
    unreadCount: 0,
    index: '2',
  },
  {
    roomId: 'room-ai-3',
    roomName: 'Rekap Laporan Bulanan',
    avatar: chatUsers[AI_BOT_USER_ID].avatar,
    users: [chatUsers[CHAT_CURRENT_USER_ID], chatUsers[AI_BOT_USER_ID]],
    unreadCount: 0,
    index: '3',
  },
]

const chatMessages: Record<string, ChatMessageRecord[]> = {
  'room-ai-1': [
    {
      _id: 'm-1001',
      senderId: CHAT_CURRENT_USER_ID,
      content: 'Bagaimana cara menambahkan aset baru ke sistem?',
      date: 'Yesterday',
      timestamp: '10:12',
      saved: true,
      distributed: true,
      seen: true,
    },
    {
      _id: 'm-1002',
      senderId: AI_BOT_USER_ID,
      content:
        'Anda bisa membuka menu Asset > Asset Fixed, lalu klik tombol "Tambah Aset" dan isi data seperti nama, kategori, dan lokasi.',
      date: 'Yesterday',
      timestamp: '10:12',
      saved: true,
      distributed: true,
      seen: true,
    },
  ],
  'room-ai-2': [
    {
      _id: 'm-2001',
      senderId: CHAT_CURRENT_USER_ID,
      content: 'Metode depresiasi apa saja yang didukung sistem ini?',
      date: 'Today',
      timestamp: '08:30',
      saved: true,
      distributed: true,
      seen: true,
    },
    {
      _id: 'm-2002',
      senderId: AI_BOT_USER_ID,
      content:
        'Saat ini didukung metode Garis Lurus (Straight Line) dan Saldo Menurun (Declining Balance), bisa diatur di menu Depreciation > Policies.',
      date: 'Today',
      timestamp: '08:30',
      saved: true,
      distributed: true,
      seen: true,
    },
  ],
  'room-ai-3': [
    {
      _id: 'm-3001',
      senderId: CHAT_CURRENT_USER_ID,
      content: 'Tolong bantu rekap laporan aset bulan ini.',
      date: 'Today',
      timestamp: '09:12',
      saved: true,
      distributed: true,
      seen: true,
    },
    {
      _id: 'm-3002',
      senderId: AI_BOT_USER_ID,
      content:
        'Anda bisa mengunduh rekap aset melalui menu Data Management > Export & Reports, lalu pilih tipe "Asset List" untuk laporan lengkap.',
      date: 'Today',
      timestamp: '09:12',
      saved: true,
      distributed: true,
      seen: true,
    },
    {
      _id: 'm-3003',
      senderId: CHAT_CURRENT_USER_ID,
      content: 'Terima kasih, sangat membantu!',
      date: 'Today',
      timestamp: '09:15',
      saved: true,
      distributed: true,
      seen: true,
    },
    {
      _id: 'm-3004',
      senderId: AI_BOT_USER_ID,
      content: 'Sama-sama! Jangan ragu bertanya lagi jika ada hal lain yang ingin dibantu.',
      date: 'Today',
      timestamp: '09:15',
      saved: true,
      distributed: true,
      seen: true,
    },
  ],
}

const AI_REPLY_RULES: Array<{ keywords: string[]; replies: string[] }> = [
  {
    keywords: ['aset baru', 'tambah aset', 'input aset', 'daftar aset'],
    replies: [
      'Untuk mendaftarkan aset baru, buka menu Asset > Asset Fixed lalu klik tombol "Tambah Aset" dan lengkapi kategori, brand, serta lokasinya.',
    ],
  },
  {
    keywords: ['depresiasi', 'penyusutan', 'susut'],
    replies: [
      'Kebijakan depresiasi bisa dikonfigurasi di menu Depreciation > Policies. Sistem mendukung metode Garis Lurus maupun Saldo Menurun.',
    ],
  },
  {
    keywords: ['laporan', 'report', 'export', 'rekap'],
    replies: [
      'Anda dapat mengunduh laporan pada menu Data Management > Export & Reports, tersedia dalam format CSV untuk berbagai jenis data.',
    ],
  },
  {
    keywords: ['stok', 'consumable', 'konsumabel', 'habis pakai'],
    replies: [
      'Stok barang consumable bisa dipantau melalui menu Asset > Asset Consumeable, termasuk notifikasi saat stok mencapai batas minimum.',
    ],
  },
  {
    keywords: ['izin', 'permission', 'akses', 'hak akses'],
    replies: [
      'Pengaturan hak akses ada di menu Permissions. Anda bisa melihat daftar izin di Permission List dan menetapkannya di Permission Assignments.',
    ],
  },
  {
    keywords: ['kategori', 'category'],
    replies: [
      'Kategori aset dapat dikelola melalui menu Master > Asset Categories, termasuk menentukan apakah kategori tersebut dapat disusutkan.',
    ],
  },
]

const AI_DEFAULT_REPLIES = [
  'Baik, saya catat. Ada lagi yang bisa saya bantu terkait pengelolaan aset perusahaan?',
  'Terima kasih atas pertanyaannya. Bisa dijelaskan sedikit lebih detail agar saya bisa membantu dengan lebih tepat?',
  'Saya masih dalam mode demo dengan jawaban template, tapi saya akan terus dikembangkan untuk membantu operasional Anda.',
]

const AI_FILE_REPLIES = [
  'Terima kasih, file Anda sudah saya terima. Pada mode demo ini saya belum bisa membaca isi filenya secara otomatis.',
]

function pickAiReply(userMessage: string): string {
  const text = userMessage.trim().toLowerCase()
  if (!text) {
    return AI_FILE_REPLIES[0]
  }
  for (const rule of AI_REPLY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.replies[Math.floor(Math.random() * rule.replies.length)]
    }
  }
  return AI_DEFAULT_REPLIES[Math.floor(Math.random() * AI_DEFAULT_REPLIES.length)]
}

const assets: AssetRecord[] = [
  {
    id: 1,
    asset_number: 'AST-0001',
    asset_name: 'Template Laptop',
    category_id: 1,
    category_name: 'Laptop',
    brand_id: 1,
    brand_name: 'Dell',
    model_id: 1,
    model_name: 'Latitude 5440',
    serial_number: 'TPL-001',
    current_location_id: 1,
    current_location_name: 'Head Office',
    managing_department_id: 'dept-it',
    company_id: 'company-main',
    status: 'AVAILABLE',
    asset_condition: 'GOOD',
    purchase_date: today,
    purchase_cost: 15000000,
    vendor_id: 1,
    vendor_name: 'Template Vendor',
    is_depreciable: true,
  },
  {
    id: 2,
    asset_number: 'AST-0002',
    asset_name: 'Template Work Desk',
    category_id: 2,
    category_name: 'Furniture',
    brand_id: 3,
    brand_name: 'IKEA',
    current_location_id: 1,
    current_location_name: 'Head Office',
    managing_department_id: 'dept-it',
    company_id: 'company-main',
    status: 'ASSIGNED',
    asset_condition: 'GOOD',
    assignment_type: 'USER',
    assigned_user_name_snapshot: 'Template User',
    purchase_date: today,
    purchase_cost: 2500000,
    is_depreciable: true,
  },
]

const consumables: ConsumableRecord[] = [
  {
    id: 1,
    consumable_code: 'CON-0001',
    name: 'Printer Paper A4',
    category_id: 3,
    category_name: 'Office Supply',
    brand_id: 2,
    brand_name: 'Lenovo',
    variant: '80 gsm',
    uom_id: 2,
    uom_code: 'BOX',
    managing_department_id: 'dept-it',
    company_id: 'company-main',
    minimum_stock: 10,
    total_stock: 8,
    is_active: true,
  },
]

const numberingConfigs: NumberingConfigRecord[] = [
  {
    id: 1,
    managing_department_id: 'dept-it',
    company_id: 'company-main',
    sequence_type: 'ASSET',
    name: 'Asset Number',
    prefix: 'AST',
    pattern: 'AST-{YYYY}-{SEQ}',
    sequence_length: 4,
    starting_sequence: 1,
    current_sequence: 2,
    reset_period: 'YEARLY',
    is_active: true,
  },
]

const permissions: PermissionRecord[] = [
  { id: 1, code: 'asset.read', name: 'View Assets', description: 'Read asset data', is_active: true },
  { id: 2, code: 'asset.write', name: 'Manage Assets', description: 'Create and update asset data', is_active: true },
  { id: 3, code: 'master.write', name: 'Manage Master Data', description: 'Create and update master data', is_active: true },
]

const permissionAssignments: PermissionAssignmentRecord[] = [
  {
    id: 1,
    permission_id: 1,
    permission_code: 'asset.read',
    permission_name: 'View Assets',
    subject_type: 'USER',
    subject_id: 'u-001',
    access_scope_type: 'GLOBAL',
    access_scope_id: null,
    is_active: true,
  },
]

const depreciationPolicies: DepreciationPolicyRecord[] = [
  {
    id: 1,
    managing_department_id: 'dept-it',
    company_id: 'company-main',
    name: 'Straight Line - 36 Months',
    method: 'STRAIGHT_LINE',
    useful_life_months: 36,
    salvage_value_type: 'FIXED',
    salvage_value: 0,
    is_active: true,
  },
]

const depreciationConfigs: Record<string, AssetDepreciationConfigRecord> = {}
const depreciationLedgers: Record<string, AssetDepreciationLedgerRecord[]> = {}
const depreciationRevisions: Record<string, AssetDepreciationRevisionRecord[]> = {}
const importPreviews: Record<string, AnyRecord> = {}

const activityLogs: ActivityLogRecord[] = []

const templateApi = {
  interceptors: {
    request: { use: () => 0 },
    response: { use: () => 0 },
  },
}

export default templateApi

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function ok<T>(data: T, message = 'Template data loaded.') {
  return Promise.resolve({ success: true, message, data: clone(data) })
}

function nextId(items: Array<{ id: number | string }>): number {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

function normalizeType(type: string): string {
  const key = type.toLowerCase()
  if (key === 'category') return 'categories'
  if (key === 'brand') return 'brands'
  if (key === 'location') return 'locations'
  if (key === 'vendor') return 'vendors'
  if (key === 'uom') return 'uoms'
  if (key === 'model') return 'models'
  return key
}

function codeFromName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

function paginate<T>(items: T[], page = 1, limit = 25): { data: T[]; meta: AssetListMeta } {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * limit
  return {
    data: items.slice(start, start + limit),
    meta: { page: currentPage, limit, total, totalPages },
  }
}

function applySimpleFilters<T extends AnyRecord>(items: T[], params: AnyRecord = {}): T[] {
  return items.filter((item) =>
    Object.entries(params).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true
      if (['page', 'limit', 'search'].includes(key)) return true
      return String(item[key]) === String(value)
    }),
  )
}

function pushActivity(action: string, module: string, entity: AnyRecord = {}) {
  activityLogs.unshift({
    id: nextId(activityLogs),
    user_id: 'u-001',
    username_snapshot: 'template.user',
    user_name_snapshot: 'Template User',
    module,
    action,
    source: 'LOCAL',
    entity_type: String(entity.entity_type || module),
    entity_id: entity.id,
    entity_reference: entity.asset_number || entity.consumable_code || entity.code || entity.name,
    entity_name_snapshot: entity.asset_name || entity.name || entity.permission_name,
    description: `${action} ${module.toLowerCase()} in local template data`,
    status: 'SUCCESS',
    created_at: new Date().toISOString(),
  })
}

function hydrateAsset(payload: AnyRecord): AssetRecord {
  const category = masterData.categories.find((item) => String(item.id) === String(payload.category_id))
  const brand = masterData.brands.find((item) => String(item.id) === String(payload.brand_id))
  const model = masterData.models.find((item) => String(item.id) === String(payload.model_id))
  const location = masterData.locations.find((item) => String(item.id) === String(payload.current_location_id))
  const vendor = masterData.vendors.find((item) => String(item.id) === String(payload.vendor_id))
  return {
    id: Number(payload.id),
    asset_number: payload.asset_number || `AST-${String(payload.id).padStart(4, '0')}`,
    asset_name: payload.asset_name || 'Untitled Asset',
    category_id: Number(payload.category_id || category?.id || 1),
    category_name: category?.name,
    brand_id: payload.brand_id,
    brand_name: brand?.name,
    model_id: payload.model_id,
    model_name: model?.name,
    current_location_id: payload.current_location_id,
    current_location_name: location?.name,
    vendor_id: payload.vendor_id,
    vendor_name: vendor?.name,
    managing_department_id: payload.managing_department_id || 'dept-it',
    company_id: payload.company_id || 'company-main',
    status: payload.status || 'REGISTERED',
    asset_condition: payload.asset_condition || 'GOOD',
    is_depreciable: category?.is_depreciable ?? true,
    ...payload,
  } as AssetRecord
}

function hydrateConsumable(payload: AnyRecord): ConsumableRecord {
  const category = masterData.categories.find((item) => String(item.id) === String(payload.category_id))
  const brand = masterData.brands.find((item) => String(item.id) === String(payload.brand_id))
  const uom = masterData.uoms.find((item) => String(item.id) === String(payload.uom_id))
  return {
    id: Number(payload.id),
    consumable_code: payload.consumable_code || `CON-${String(payload.id).padStart(4, '0')}`,
    name: payload.name || 'Untitled Consumable',
    category_id: Number(payload.category_id || category?.id || 3),
    category_name: category?.name,
    brand_id: payload.brand_id,
    brand_name: brand?.name,
    uom_id: Number(payload.uom_id || uom?.id || 1),
    uom_code: uom?.code,
    uom_name: uom?.name,
    managing_department_id: payload.managing_department_id || 'dept-it',
    company_id: payload.company_id || 'company-main',
    minimum_stock: payload.minimum_stock ?? 0,
    total_stock: payload.total_stock ?? 0,
    is_active: payload.is_active ?? true,
    ...payload,
  } as ConsumableRecord
}

function csvBlob(rows: string[][]): Blob {
  const text = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  return new Blob([text], { type: 'text/csv;charset=utf-8' })
}

export async function getAssets(params: AssetListParams = {}): Promise<AssetListResponse> {
  const term = params.search?.trim().toLowerCase()
  let rows = applySimpleFilters(assets, params)
  if (term) {
    rows = rows.filter((asset) =>
      [asset.asset_number, asset.asset_name, asset.serial_number].some((value) =>
        String(value || '').toLowerCase().includes(term),
      ),
    )
  }
  const result = paginate(rows, params.page, params.limit)
  return { success: true, message: 'Template assets loaded.', data: clone(result.data), meta: result.meta }
}

export async function createAsset(payload: AnyRecord): Promise<AssetResponse> {
  const asset = hydrateAsset({ id: nextId(assets), ...payload })
  assets.unshift(asset)
  pushActivity('CREATE', 'ASSET', asset)
  return ok(asset, 'Template asset created.')
}

export async function updateAsset(id: number | string, payload: AnyRecord): Promise<AssetResponse> {
  const index = assets.findIndex((asset) => String(asset.id) === String(id))
  const current = index >= 0 ? assets[index] : hydrateAsset({ id, ...payload })
  const updated = hydrateAsset({ ...current, ...payload, id: current.id })
  if (index >= 0) assets[index] = updated
  pushActivity('UPDATE', 'ASSET', updated)
  return ok(updated, 'Template asset updated.')
}

export async function getAssetHistory(id: number | string): Promise<AssetHistoryResponse> {
  const asset = assets.find((item) => String(item.id) === String(id)) || assets[0]
  return ok({
    asset,
    history: [
      {
        id: 1,
        asset_id: asset.id,
        event_type: 'REGISTERED',
        event_date: asset.purchase_date || today,
        description: 'Template history event',
        performed_by: 'Template User',
        created_at: new Date().toISOString(),
      },
    ],
    assignments: asset.assignment_type
      ? [
          {
            id: 1,
            asset_id: asset.id,
            assignment_type: asset.assignment_type,
            assigned_user_name_snapshot: asset.assigned_user_name_snapshot,
            assigned_at: today,
            assigned_by: 'Template User',
          },
        ]
      : [],
    transfers: [],
    maintenances: [],
    external_references: [],
  })
}

export async function assignAsset(id: number | string, payload: AnyRecord): Promise<AssetAssignmentResponse> {
  const asset = assets.find((item) => String(item.id) === String(id))
  if (asset) {
    asset.status = 'ASSIGNED'
    asset.assignment_type = payload.assignment_type
    asset.assigned_user_id = payload.assigned_user_id
    asset.assigned_department_id = payload.assigned_department_id
    asset.assigned_location_id = payload.assigned_location_id
  }
  return ok({ id: Date.now(), asset_id: id, ...payload }, 'Template asset assigned.')
}

export async function returnAsset(id: number | string, payload: AnyRecord = {}): Promise<AssetAssignmentResponse> {
  const asset = assets.find((item) => String(item.id) === String(id))
  if (asset) asset.status = 'AVAILABLE'
  return ok({ id: Date.now(), asset_id: id, ...payload }, 'Template asset returned.')
}

export async function transferAsset(id: number | string, payload: AnyRecord): Promise<AssetTransferResponse> {
  const asset = assets.find((item) => String(item.id) === String(id)) || assets[0]
  if (payload.to_location_id) {
    const location = masterData.locations.find((item) => String(item.id) === String(payload.to_location_id))
    asset.current_location_id = payload.to_location_id
    asset.current_location_name = location?.name
  }
  return ok(asset, 'Template asset transferred.')
}

export async function createAssetMaintenance(id: number | string, payload: AnyRecord): Promise<AssetMaintenanceResponse> {
  return ok({ id: Date.now(), asset_id: id, status: 'OPEN', ...payload }, 'Template maintenance created.')
}

export async function completeAssetMaintenance(
  id: number | string,
  maintenanceId: number | string,
  payload: AnyRecord = {},
): Promise<AssetMaintenanceResponse> {
  return ok({ id: maintenanceId, asset_id: id, status: 'COMPLETED', ...payload }, 'Template maintenance completed.')
}

export async function updateAssetLifecycle(id: number | string, payload: AnyRecord): Promise<AssetResponse> {
  const asset = assets.find((item) => String(item.id) === String(id)) || assets[0]
  asset.status = payload.status || asset.status
  return ok(asset, 'Template lifecycle updated.')
}

export async function getConsumables(params: AnyRecord = {}): Promise<ConsumableListResponse> {
  const term = params.search?.trim().toLowerCase()
  let rows = applySimpleFilters(consumables, params)
  if (term) {
    rows = rows.filter((item) =>
      [item.consumable_code, item.name].some((value) => String(value || '').toLowerCase().includes(term)),
    )
  }
  const result = paginate(rows, params.page, params.limit)
  return { success: true, message: 'Template consumables loaded.', data: clone(result.data), meta: result.meta }
}

export async function createConsumable(payload: AnyRecord): Promise<ConsumableResponse> {
  const consumable = hydrateConsumable({ id: nextId(consumables), ...payload })
  consumables.unshift(consumable)
  pushActivity('CREATE', 'CONSUMABLE', consumable)
  return ok(consumable, 'Template consumable created.')
}

export async function updateConsumable(id: number | string, payload: AnyRecord): Promise<ConsumableResponse> {
  const index = consumables.findIndex((item) => String(item.id) === String(id))
  const current = index >= 0 ? consumables[index] : hydrateConsumable({ id, ...payload })
  const updated = hydrateConsumable({ ...current, ...payload, id: current.id })
  if (index >= 0) consumables[index] = updated
  return ok(updated, 'Template consumable updated.')
}

export async function getConsumableHistory(id: number | string) {
  const consumable = consumables.find((item) => String(item.id) === String(id)) || consumables[0]
  return ok({
    consumable,
    balances: masterData.locations.map((location, index) => ({
      consumable_id: consumable.id,
      location_id: location.id,
      location_code: location.code,
      location_name: location.name,
      quantity: index === 0 ? consumable.total_stock || 0 : 0,
    })),
    transactions: [
      {
        id: 1,
        transaction_number: 'TRX-0001',
        consumable_id: consumable.id,
        movement_type: 'OPENING_BALANCE',
        to_location_id: 1,
        to_location_name: 'Head Office',
        quantity: consumable.total_stock || 0,
        transaction_date: today,
      },
    ],
  })
}

export async function createConsumableMovement(id: number | string, payload: AnyRecord) {
  return ok({ id: Date.now(), transaction_number: `TRX-${Date.now()}`, consumable_id: id, ...payload })
}

export async function getMasterData(type: string, params: AnyRecord = {}): Promise<MasterDataListResponse> {
  const key = normalizeType(type)
  const rows = applySimpleFilters(masterData[key] || [], params)
  return ok(rows, 'Template master data loaded.')
}

export async function createMasterData(type: string, payload: AnyRecord): Promise<MasterDataResponse> {
  const key = normalizeType(type)
  if (!masterData[key]) masterData[key] = []
  const row = {
    id: nextId(masterData[key]),
    code: payload.code || codeFromName(payload.name || key),
    is_active: true,
    ...payload,
  }
  masterData[key].unshift(row)
  pushActivity('CREATE', 'MASTER_DATA', row)
  return ok(row, 'Template master data created.')
}

export async function updateMasterData(type: string, id: number | string, payload: AnyRecord): Promise<MasterDataResponse> {
  const key = normalizeType(type)
  if (!masterData[key]) masterData[key] = []
  const index = masterData[key].findIndex((item) => String(item.id) === String(id))
  const row = { ...(index >= 0 ? masterData[key][index] : { id }), ...payload }
  if (index >= 0) masterData[key][index] = row
  return ok(row, 'Template master data updated.')
}

export async function getNumberingConfigs(): Promise<NumberingConfigListResponse> {
  return ok(numberingConfigs)
}

export async function createNumberingConfig(payload: AnyRecord): Promise<NumberingConfigResponse> {
  const row = { id: nextId(numberingConfigs), current_sequence: payload.starting_sequence || 1, ...payload }
  numberingConfigs.unshift(row as NumberingConfigRecord)
  return ok(row as NumberingConfigRecord)
}

export async function updateNumberingConfig(id: number | string, payload: AnyRecord): Promise<NumberingConfigResponse> {
  const index = numberingConfigs.findIndex((item) => String(item.id) === String(id))
  const row = { ...(index >= 0 ? numberingConfigs[index] : numberingConfigs[0]), ...payload }
  if (index >= 0) numberingConfigs[index] = row
  return ok(row)
}

export async function getPermissions(): Promise<PermissionListResponse> {
  return ok(permissions)
}

export async function getPermissionAssignments(
  params: PermissionAssignmentListParams = {},
): Promise<PermissionAssignmentListResponse> {
  return ok(applySimpleFilters(permissionAssignments, params))
}

export async function createPermissionAssignment(payload: AnyRecord): Promise<PermissionAssignmentResponse> {
  const permission = permissions.find((item) => item.code === payload.permission_code) || permissions[0]
  const row: PermissionAssignmentRecord = {
    id: nextId(permissionAssignments),
    permission_id: permission.id,
    permission_code: permission.code,
    permission_name: permission.name,
    subject_type: payload.subject_type,
    subject_id: String(payload.subject_id),
    access_scope_type: payload.access_scope_type,
    access_scope_id: payload.access_scope_type === 'GLOBAL' ? null : String(payload.access_scope_id || ''),
    is_active: true,
  }
  permissionAssignments.unshift(row)
  return ok(row)
}

export async function deletePermissionAssignment(id: number | string): Promise<PermissionAssignmentResponse> {
  const index = permissionAssignments.findIndex((item) => String(item.id) === String(id))
  const [row] = index >= 0 ? permissionAssignments.splice(index, 1) : [permissionAssignments[0]]
  return ok(row)
}

export async function getDirectoryUsers(): Promise<DirectoryListResponse> {
  return ok(directory.users)
}

export async function getDirectoryDepartments(): Promise<DirectoryListResponse> {
  return ok(directory.departments)
}

export async function getDirectoryCompanies(): Promise<DirectoryListResponse> {
  return ok(directory.companies)
}

export async function getChatRooms(): Promise<ChatRoomListResponse> {
  const rooms = [...chatRooms]
    .sort((a, b) => Number(b.index) - Number(a.index))
    .map((room) => {
      const roomMessages = chatMessages[room.roomId] || []
      const last = roomMessages[roomMessages.length - 1]
      return {
        ...room,
        lastMessage: last
          ? {
              content: last.content,
              senderId: last.senderId,
              timestamp: last.timestamp,
              saved: last.saved,
              distributed: last.distributed,
              seen: last.seen,
            }
          : undefined,
      }
    })
  return ok(rooms, 'Template chat rooms loaded.')
}

export async function getChatMessages(roomId: string): Promise<ChatMessageListResponse> {
  return ok(chatMessages[roomId] || [], 'Template chat messages loaded.')
}

export async function markChatRoomRead(roomId: string): Promise<{ success: boolean; message: string; data: null }> {
  const room = chatRooms.find((item) => item.roomId === roomId)
  if (room) room.unreadCount = 0
  return { success: true, message: 'Template chat room marked as read.', data: null }
}

export async function sendChatMessage(
  roomId: string,
  payload: { content?: string; files?: ChatMessageFileRecord[]; replyMessage?: AnyRecord },
): Promise<ChatMessageResponse> {
  if (!chatMessages[roomId]) chatMessages[roomId] = []
  const now = new Date()
  const message: ChatMessageRecord = {
    _id: `m-${Date.now()}`,
    senderId: CHAT_CURRENT_USER_ID,
    content: payload.content || '',
    date: 'Today',
    timestamp: now.toTimeString().slice(0, 5),
    saved: true,
    distributed: true,
    seen: false,
    files: payload.files,
    replyMessage: payload.replyMessage,
  }
  chatMessages[roomId] = [...chatMessages[roomId], message]
  const room = chatRooms.find((item) => item.roomId === roomId)
  if (room) room.index = String(Date.now())
  return ok(message, 'Template chat message sent.')
}

export async function sendAiReply(roomId: string, userMessage: string): Promise<ChatMessageResponse> {
  if (!chatMessages[roomId]) chatMessages[roomId] = []
  const now = new Date()
  const message: ChatMessageRecord = {
    _id: `m-${Date.now()}-ai`,
    senderId: AI_BOT_USER_ID,
    content: pickAiReply(userMessage),
    date: 'Today',
    timestamp: now.toTimeString().slice(0, 5),
    saved: true,
    distributed: true,
    seen: true,
  }
  chatMessages[roomId] = [...chatMessages[roomId], message]
  const room = chatRooms.find((item) => item.roomId === roomId)
  if (room) room.index = String(Date.now())
  return ok(message, 'Template AI reply generated.')
}

export async function createChatConversation(): Promise<ChatRoomResponse> {
  const roomId = `room-ai-${Date.now()}`
  const room: ChatRoomRecord = {
    roomId,
    roomName: 'Percakapan Baru',
    avatar: chatUsers[AI_BOT_USER_ID].avatar,
    users: [chatUsers[CHAT_CURRENT_USER_ID], chatUsers[AI_BOT_USER_ID]],
    unreadCount: 0,
    index: String(Date.now()),
  }
  chatRooms.unshift(room)
  chatMessages[roomId] = []
  return ok(room, 'Template conversation created.')
}

export async function getDashboard(): Promise<DashboardResponse> {
  const byStatus = assets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.status] = (acc[asset.status] || 0) + 1
    return acc
  }, {})
  const lowStock = consumables.filter((item) => Number(item.total_stock || 0) <= Number(item.minimum_stock || 0))
  return ok({
    assets: { total: assets.length, by_status: byStatus },
    consumables: {
      total_masters: consumables.length,
      low_stock: lowStock.map((item) => ({
        id: item.id,
        consumable_code: item.consumable_code,
        name: item.name,
        minimum_stock: item.minimum_stock,
        total_stock: item.total_stock || 0,
      })),
    },
  })
}

export async function getActivityLogs(params: ActivityLogParams = {}): Promise<ActivityLogListResponse> {
  const result = paginate(activityLogs, params.page, params.limit || 8)
  return { success: true, message: 'Template activity loaded.', data: clone(result.data), meta: result.meta }
}

export async function getDepreciationPolicies(): Promise<DepreciationPolicyListResponse> {
  return ok(depreciationPolicies)
}

export async function createDepreciationPolicy(payload: AnyRecord): Promise<DepreciationPolicyResponse> {
  const row = {
    id: nextId(depreciationPolicies),
    method: 'STRAIGHT_LINE',
    salvage_value_type: 'FIXED',
    salvage_value: 0,
    is_active: true,
    ...payload,
  } as DepreciationPolicyRecord
  depreciationPolicies.unshift(row)
  return ok(row)
}

export async function updateDepreciationPolicy(id: number | string, payload: AnyRecord): Promise<DepreciationPolicyResponse> {
  const index = depreciationPolicies.findIndex((item) => String(item.id) === String(id))
  const row = { ...(index >= 0 ? depreciationPolicies[index] : depreciationPolicies[0]), ...payload }
  if (index >= 0) depreciationPolicies[index] = row
  return ok(row)
}

export async function setCategoryDepreciationDefault(
  payload: CategoryDepreciationDefaultPayload,
): Promise<CategoryDepreciationDefaultResponse> {
  const policy = depreciationPolicies.find((item) => String(item.id) === String(payload.depreciation_policy_id))
  return ok({ ...payload, policy_name: policy?.name, method: policy?.method, useful_life_months: policy?.useful_life_months })
}

export async function getDepreciationSuggestion(): Promise<DepreciationSuggestionResponse> {
  const policy = depreciationPolicies[0]
  return ok(
    policy
      ? {
          category_id: 1,
          managing_department_id: policy.managing_department_id,
          company_id: policy.company_id,
          depreciation_policy_id: policy.id,
          policy_name: policy.name,
          method: policy.method,
          useful_life_months: policy.useful_life_months,
          salvage_value_type: policy.salvage_value_type,
          salvage_value: policy.salvage_value,
        }
      : null,
  )
}

export async function getAssetDepreciation(assetId: number | string): Promise<AssetDepreciationResponse> {
  const asset = assets.find((item) => String(item.id) === String(assetId)) || assets[0]
  return ok({
    asset,
    config: depreciationConfigs[String(asset.id)] || null,
    revisions: depreciationRevisions[String(asset.id)] || [],
    ledger: depreciationLedgers[String(asset.id)] || [],
  })
}

export async function configureAssetDepreciation(
  assetId: number | string,
  payload: AnyRecord,
): Promise<AssetDepreciationConfigResponse> {
  const asset = assets.find((item) => String(item.id) === String(assetId)) || assets[0]
  const policy = depreciationPolicies.find((item) => String(item.id) === String(payload.depreciation_policy_id))
  const config: AssetDepreciationConfigRecord = {
    id: Date.now(),
    asset_id: asset.id,
    depreciation_policy_id: policy?.id,
    purchase_cost_snapshot: asset.purchase_cost || 0,
    depreciation_method: payload.depreciation_method || policy?.method || 'STRAIGHT_LINE',
    useful_life_months: Number(payload.useful_life_months || policy?.useful_life_months || 12),
    salvage_value_type: payload.salvage_value_type || policy?.salvage_value_type || 'FIXED',
    salvage_value: payload.salvage_value ?? policy?.salvage_value ?? 0,
    depreciation_start_date: payload.depreciation_start_date || asset.purchase_date || today,
    is_active: true,
  }
  depreciationConfigs[String(asset.id)] = config
  return ok(config)
}

export async function reviseAssetDepreciation(
  assetId: number | string,
  payload: AnyRecord,
): Promise<AssetDepreciationConfigResponse> {
  const current = depreciationConfigs[String(assetId)] || (await configureAssetDepreciation(assetId, {})).data
  const next = { ...current, ...payload }
  depreciationConfigs[String(assetId)] = next
  if (!depreciationRevisions[String(assetId)]) depreciationRevisions[String(assetId)] = []
  depreciationRevisions[String(assetId)].unshift({
    id: Date.now(),
    asset_id: Number(assetId),
    effective_date: payload.effective_date || today,
    reason: payload.reason || 'Template revision',
    changed_by: 'Template User',
    created_at: new Date().toISOString(),
  })
  return ok(next)
}

export async function generateDepreciationLedger(
  assetId: number | string,
  payload: AnyRecord = {},
): Promise<AssetDepreciationLedgerListResponse> {
  const config = depreciationConfigs[String(assetId)] || (await configureAssetDepreciation(assetId, {})).data
  const cost = Number(config.purchase_cost_snapshot || 0)
  const monthly = Math.max(0, Math.round(cost / Math.max(1, Number(config.useful_life_months || 1))))
  const start = new Date(payload.through_date || today)
  const rows = Array.from({ length: 3 }, (_, index) => {
    const opening = Math.max(0, cost - monthly * index)
    const closing = Math.max(0, opening - monthly)
    return {
      id: index + 1,
      asset_id: Number(assetId),
      period_year: start.getFullYear(),
      period_month: Math.max(1, start.getMonth() + 1 - (2 - index)),
      opening_book_value: opening,
      depreciation_amount: monthly,
      accumulated_depreciation: cost - closing,
      closing_book_value: closing,
      calculation_method: config.depreciation_method,
      is_final: false,
      generated_at: new Date().toISOString(),
    }
  })
  depreciationLedgers[String(assetId)] = rows
  return ok(rows)
}

export async function finalizeDepreciationPeriod(
  assetId: number | string,
  payload: AnyRecord,
): Promise<FinalizeDepreciationResponse> {
  const rows = depreciationLedgers[String(assetId)] || []
  const row = rows.find(
    (item) => item.period_year === payload.period_year && item.period_month === payload.period_month,
  )
  if (row) row.is_final = true
  return ok({ finalized: true, period_year: payload.period_year, period_month: payload.period_month })
}

export async function previewImport(type: ImportType, file: File): Promise<ImportPreviewResponse> {
  const token = `preview-${Date.now()}`
  const preview = {
    preview_token: token,
    import_reference: `IMP-${Date.now()}`,
    import_type: type,
    original_filename: file.name,
    summary: { total: 2, valid: 2, warnings: 0, invalid: 0 },
    rows: [
      { source_row: 2, action: 'CREATE', status: 'VALID', errors: [], warnings: [], original: { name: 'Template Row 1' } },
      { source_row: 3, action: 'CREATE', status: 'VALID', errors: [], warnings: [], original: { name: 'Template Row 2' } },
    ],
  }
  importPreviews[token] = preview
  return ok(preview, 'Template import preview created.')
}

export async function commitImport(previewToken: string): Promise<ImportCommitResponse> {
  const preview = importPreviews[previewToken]
  return ok({
    import_reference: preview?.import_reference || `IMP-${Date.now()}`,
    import_type: preview?.import_type || 'ASSET',
    summary: { total: preview?.summary?.total || 0, success: preview?.summary?.valid || 0, failed: 0 },
    successes: preview?.rows || [],
    error_file_token: null,
  })
}

export async function cancelImportPreview(previewToken: string): Promise<{ success: boolean; message: string; data: unknown }> {
  delete importPreviews[previewToken]
  return ok(null, 'Template preview canceled.')
}

export async function downloadImportTemplate(type: ImportType): Promise<DownloadedFile> {
  return {
    blob: csvBlob([
      ['code', 'name', 'notes'],
      [`${type}-001`, 'Template row', 'Replace with your own columns'],
    ]),
    filename: `template-${type.toLowerCase()}-import.csv`,
  }
}

export async function downloadImportErrors(): Promise<DownloadedFile> {
  return {
    blob: csvBlob([
      ['row', 'message'],
      ['-', 'No errors in template mode'],
    ]),
    filename: 'template-import-errors.csv',
  }
}

export async function exportData(type: ExportType): Promise<ExportedFile> {
  const rows = [
    ['report_type', 'generated_from'],
    [type, 'local template data'],
  ]
  return {
    blob: csvBlob(rows),
    filename: `template-${type.toLowerCase()}-export.csv`,
    rowCount: rows.length - 1,
  }
}
