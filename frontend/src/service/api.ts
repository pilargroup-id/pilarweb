import { getToken, clearToken } from './auth'
import { filenameFromDisposition } from '@/utils/download'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type AnyRecord = Record<string, any>

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/**
 * Thrown for any non-2xx response. `status` lets callers branch per the
 * HTTP-handling table in PILARWEB_FRONTEND_INTEGRATION.md (401/403/404/409/422/5xx).
 */
export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: AnyRecord
  body?: unknown
}

function buildQuery(params?: AnyRecord): string {
  if (!params) return ''
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body } = options
  const token = getToken()

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    clearToken()
  }

  let payload: AnyRecord | null = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.message || `Request failed (${response.status})`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

// ---------------------------------------------------------------------------
// Auth (section 3)
// ---------------------------------------------------------------------------

export interface CurrentUser extends AnyRecord {
  id: string | number
}

export function getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
  return request('/api/auth/me')
}

// ---------------------------------------------------------------------------
// Item (section 4) — proxied/passed through from Itembase as-is
// ---------------------------------------------------------------------------

export interface ItemListParams extends AnyRecord {
  page?: number
  limit?: number
  search?: string
}

export function getItems(params: ItemListParams = {}): Promise<AnyRecord> {
  return request('/api/item/items', { params })
}

// ---------------------------------------------------------------------------
// Master bootstrap & master data (section 5)
// ---------------------------------------------------------------------------

export interface RequestPurpose extends AnyRecord {
  id: number | string
  code: string
}

export interface ApprovalRule extends AnyRecord {
  id: number | string
  department_id?: string | number
}

export interface WarehouseLocation extends AnyRecord {
  id: number | string
}

export type FinancialClosing = AnyRecord | null

export interface MasterBootstrap {
  request_purposes: RequestPurpose[]
  approval_rules: ApprovalRule[]
  warehouse_locations: WarehouseLocation[]
  financial_closing: FinancialClosing
}

export function getMasterBootstrap(): Promise<ApiResponse<MasterBootstrap>> {
  return request('/api/master/bootstrap')
}

export function getRequestPurposes(): Promise<ApiResponse<RequestPurpose[]>> {
  return request('/api/master/request-purposes')
}

export interface RequestPurposePayload {
  code: string
  name: string
  description?: string | null
  sort_order?: number
  is_active?: boolean | number
}

export function createRequestPurpose(
  payload: RequestPurposePayload,
): Promise<ApiResponse<RequestPurpose>> {
  return request('/api/master/request-purposes', { method: 'POST', body: payload })
}

export function updateRequestPurpose(
  id: string | number,
  payload: RequestPurposePayload,
): Promise<ApiResponse<RequestPurpose>> {
  return request(`/api/master/request-purposes/${id}`, { method: 'PUT', body: payload })
}

export function deleteRequestPurpose(id: string | number): Promise<ApiResponse<null>> {
  return request(`/api/master/request-purposes/${id}`, { method: 'DELETE' })
}

export function getApprovalRules(
  departmentId?: string | number,
): Promise<ApiResponse<ApprovalRule[]>> {
  return request('/api/master/approval-rules', {
    params: departmentId !== undefined ? { department_id: departmentId } : undefined,
  })
}

export interface ApprovalRulePayload {
  code: string
  name: string
  department_id?: number | null
  department_name?: string | null
  requester_block_min_job_level_value?: number | null
  approver_min_job_level_value: number
  approver_job_level_name?: string | null
  allow_higher_job_level?: boolean | number
  priority?: number
  is_active?: boolean | number
}

export function createApprovalRule(
  payload: ApprovalRulePayload,
): Promise<ApiResponse<ApprovalRule>> {
  return request('/api/master/approval-rules', { method: 'POST', body: payload })
}

export interface JobLevelRecord extends AnyRecord {
  id: number | string
  name?: string
}

export function getJobLevels(): Promise<ApiResponse<JobLevelRecord[]>> {
  return request('/api/master/job-levels')
}

export interface DepartmentRecord extends AnyRecord {
  id: number | string
  name?: string
}

export function getDepartments(): Promise<ApiResponse<DepartmentRecord[]>> {
  return request('/api/internal/directory/departments')
}

export function getWarehouseLocations(): Promise<ApiResponse<WarehouseLocation[]>> {
  return request('/api/master/warehouse-locations')
}

export interface WarehouseLocationPayload {
  code: string
  name: string
  is_loan_warehouse?: boolean | number
  is_active?: boolean | number
}

export function createWarehouseLocation(
  payload: WarehouseLocationPayload,
): Promise<ApiResponse<WarehouseLocation>> {
  return request('/api/master/warehouse-locations', { method: 'POST', body: payload })
}

export function updateWarehouseLocation(
  id: string | number,
  payload: WarehouseLocationPayload,
): Promise<ApiResponse<WarehouseLocation>> {
  return request(`/api/master/warehouse-locations/${id}`, { method: 'PUT', body: payload })
}

export function getFinancialClosing(): Promise<ApiResponse<FinancialClosing>> {
  return request('/api/master/financial-closing')
}

export interface FinancialClosingSettingPayload {
  closing_day: number
  timezone: string
}

export function updateFinancialClosing(
  payload: FinancialClosingSettingPayload,
): Promise<ApiResponse<FinancialClosing>> {
  return request('/api/master/financial-closing', { method: 'PUT', body: payload })
}

// ---------------------------------------------------------------------------
// Requests (sections 9, 10)
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateRequestItemPayload {
  itembase_item_id: string | number
  requested_qty: number
  notes?: string
}

export interface CreateRequestPayload {
  request_purpose_id: string | number
  reason: string
  items: CreateRequestItemPayload[]
}

export interface PilarwebRequest extends AnyRecord {
  id: string
  request_number: string
  status: string
}

export function createRequest(payload: CreateRequestPayload): Promise<ApiResponse<PilarwebRequest>> {
  return request('/api/requests', { method: 'POST', body: payload })
}

export function getMyRequests(
  params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    purpose_id?: number | string
    target_department_id?: number | string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<PilarwebRequest[]>> {
  return request('/api/requests', { params })
}

export function getRequestById(id: string): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${id}`)
}

export interface ActivityLogRecord extends AnyRecord {
  id: number
  module: string
  action: string
  status: 'SUCCESS' | 'FAILED'
  user_name_snapshot: string | null
  entity_type: string
  entity_reference: string | null
  entity_name_snapshot: string | null
  created_at: string
}

export function getRecentActivity(
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResponse<ActivityLogRecord[]>> {
  return request('/api/requests/activity/recent', { params })
}

export function submitRequest(id: string): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${id}/submit`, { method: 'POST' })
}

export interface UpdateRequestPayload {
  request_purpose_id?: string | number
  reason?: string
}

export function updateRequest(
  id: string,
  payload: UpdateRequestPayload,
): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${id}`, { method: 'PUT', body: payload })
}

export function addRequestItem(
  requestId: string,
  payload: CreateRequestItemPayload,
): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${requestId}/items`, { method: 'POST', body: payload })
}

export interface UpdateRequestItemPayload {
  requested_qty?: number
  notes?: string | null
}

export function updateRequestItem(
  requestId: string,
  itemId: string | number,
  payload: UpdateRequestItemPayload,
): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${requestId}/items/${itemId}`, { method: 'PUT', body: payload })
}

export function removeRequestItem(
  requestId: string,
  itemId: string | number,
): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${requestId}/items/${itemId}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Department Approval (section 8)
// ---------------------------------------------------------------------------

export interface ApprovalQueueItem extends AnyRecord {
  id: number | string
  request_id: string
  request_number: string
  requester_name?: string
  department_name?: string
  request_purpose_name?: string
  submitted_at?: string
  request_status: string
}

export function getApprovals(
  params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    target_department_id?: number | string
    purpose_id?: number | string
    return_type?: string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<ApprovalQueueItem[]>> {
  return request('/api/approvals', { params })
}

export function getApprovalById(id: number | string): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/approvals/${id}`)
}

export function approveApproval(
  id: number | string,
  payload: { note?: string | null } = {},
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/approvals/${id}/approve`, { method: 'POST', body: payload })
}

export function cancelApproval(
  id: number | string,
  payload: { reason: string },
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/approvals/${id}/cancel`, { method: 'POST', body: payload })
}

export function revertApproval(
  id: number | string,
  payload: { reason: string },
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/approvals/${id}/revert`, { method: 'POST', body: payload })
}

// ---------------------------------------------------------------------------
// Finance Review (section 9)
// ---------------------------------------------------------------------------

export interface FinanceQueueItem extends AnyRecord {
  finance_review_id: number | string
  finance_review_status: string
  request_id: string
  request_number: string
  request_status: string
}

export function getFinanceRequests(
  params: {
    page?: number
    limit?: number
    search?: string
    department_id?: number | string
    purpose_id?: number | string
    return_type?: string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<FinanceQueueItem[]>> {
  return request('/api/finance/requests', { params })
}

export function getFinanceRequestById(requestId: string): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/finance/requests/${requestId}`)
}

export interface FinanceHistoryItem extends AnyRecord {
  finance_review_id: number | string
  finance_review_status: string
  reviewer_name?: string | null
  reviewed_at?: string | null
  request_id: string
  request_number: string
  request_status: string
}

export function getFinanceHistory(
  params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    department_id?: number | string
    purpose_id?: number | string
    return_type?: string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<FinanceHistoryItem[]>> {
  return request('/api/finance/requests/history', { params })
}

export interface FinanceReviewItemDecision {
  request_item_id: number | string
  decision: 'APPROVED' | 'REJECTED' | 'CANCELED'
  approved_qty?: number
  note?: string | null
}

export interface FinanceReviewPayload {
  note?: string | null
  items: FinanceReviewItemDecision[]
}

export function submitFinanceReview(
  requestId: string,
  payload: FinanceReviewPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/finance/requests/${requestId}/review`, { method: 'POST', body: payload })
}

export interface FinanceReportExportParams extends AnyRecord {
  date_from?: string
  date_to?: string
  department_id?: number | string
  target_department_id?: number | string
  purpose_id?: number | string
  return_type?: 'RETURNABLE' | 'NON_RETURNABLE'
  status?: string
  sku?: string
  search?: string
}

export async function exportFinanceRequestsReport(
  params: FinanceReportExportParams = {},
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}/api/finance/reports/requests/export${buildQuery(params)}`, {
    method: 'GET',
    headers,
  })

  if (response.status === 401) {
    clearToken()
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = await response.json()
      message = payload?.message || message
    } catch {
      // response body wasn't JSON; keep the default message
    }
    throw new ApiError(message, response.status)
  }

  const blob = await response.blob()
  const filename = filenameFromDisposition(
    response.headers.get('content-disposition'),
    'finance-requests-report.xlsx',
  )
  return { blob, filename }
}

// ---------------------------------------------------------------------------
// Warehouse Fulfillment lifecycle (section 9 of the integration guide):
// Picking -> Ready for Dispatch -> Print DO / Dispatched.
// ---------------------------------------------------------------------------

export interface WarehouseFulfillmentListItem extends AnyRecord {
  id: number | string
  fulfillment_number: string
  status: 'PICKING' | 'ADMINISTRATIVE_PENDING' | 'READY_FOR_DISPATCH' | 'DISPATCHED' | 'COMPLETED'
  request_id: string
  request_number: string
  request_status?: string
  total_actual_qty?: number
  dispatched_at?: string | null
  do_print_count?: number
  last_do_printed_at?: string | null
  last_do_printed_by_name?: string | null
  purpose_return_type?: 'RETURNABLE' | 'NON_RETURNABLE' | null
  request_purpose_name?: string | null
  requester_name?: string | null
  department_name?: string | null
}

export function getWarehouseFulfillments(
  params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    mode?: string
    department_id?: number | string
    purpose_id?: number | string
    return_type?: string
    request_status?: string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<WarehouseFulfillmentListItem[]>> {
  return request('/api/warehouse/fulfillments', { params })
}

export function getWarehouseFulfillmentDetail(fulfillmentId: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}`)
}

export function printPickingForm(fulfillmentId: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/print-picking`, { method: 'POST' })
}

export interface FulfillmentProgressItemPayload {
  fulfillment_item_id: number | string
  actual_qty?: number | null
  note?: string | null
}

export interface FulfillmentProgressPayload {
  source_warehouse_id?: number | string | null
  inventory_transfer_number?: string | null
  items: FulfillmentProgressItemPayload[]
}

export function saveFulfillmentProgress(
  fulfillmentId: string | number,
  payload: FulfillmentProgressPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/progress`, { method: 'PUT', body: payload })
}

export function completeFulfillmentPicking(
  fulfillmentId: string | number,
  payload: FulfillmentProgressPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/complete`, { method: 'POST', body: payload })
}

export function printFulfillmentDeliveryOrder(
  fulfillmentId: string | number,
  payload: { note?: string | null } = {},
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/print-do`, { method: 'POST', body: payload })
}

// ---------------------------------------------------------------------------
// Requester Physical Receipt / Delivery Confirmation (section 10)
// ---------------------------------------------------------------------------

export interface DeliveryReceiptListItem extends AnyRecord {
  id: number | string
  request_id: string
  request_number?: string
  request_purpose_name?: string
  purpose_return_type?: 'NON_RETURNABLE' | 'RETURNABLE'
  fulfillment_number?: string
  fulfillment_type?: string
  dispatched_at?: string | null
  confirmation_deadline_at?: string | null
  status: 'PENDING' | 'PARTIAL' | 'RECEIVED'
  confirmation_method?: 'MANUAL' | 'AUTO' | null
}

export function getMyDeliveries(
  params: { page?: number; limit?: number; status?: string } = {},
): Promise<PaginatedResponse<DeliveryReceiptListItem[]>> {
  return request('/api/deliveries/my', { params })
}

export function getDeliveryById(id: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/deliveries/${id}`)
}

export interface ConfirmDeliveryItemPayload {
  delivery_receipt_item_id: number | string
  received_qty: number
}

export interface ConfirmDeliveryPayload {
  items: ConfirmDeliveryItemPayload[]
}

export function confirmDelivery(
  id: string | number,
  payload: ConfirmDeliveryPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/deliveries/${id}/confirm`, { method: 'POST', body: payload })
}

// ---------------------------------------------------------------------------
// Warehouse Delivery Discrepancy (section 12)
// ---------------------------------------------------------------------------

export interface WarehouseDiscrepancyListItem extends AnyRecord {
  id: number | string
  request_id: string
  request_number?: string
  requester_name?: string
  department_name?: string
  fulfillment_id?: number | string
  fulfillment_number?: string
  item_code?: string
  item_name?: string
  expected_qty: number
  received_qty: number
  difference_qty: number
  status: 'OPEN' | 'OVERDUE' | 'ESCALATED' | 'SUPERVISOR_REQUIRED' | 'RESOLVED'
  resolution_type?: 'RESEND' | 'CLOSE_WITH_REASON' | null
  resolution_due_at?: string | null
  escalation_due_at?: string | null
  supervisor_lock_at?: string | null
  resolved_at?: string | null
}

export function getWarehouseDiscrepancies(
  params: {
    page?: number
    limit?: number
    search?: string
    status?: string
  } = {},
): Promise<PaginatedResponse<WarehouseDiscrepancyListItem[]>> {
  return request('/api/warehouse/discrepancies', { params })
}

export interface ResolveDiscrepancyPayload {
  resolution_type: 'RESEND' | 'CLOSE_WITH_REASON'
  resolution_note?: string | null
  late_resolution_reason?: string | null
}

export function resolveWarehouseDiscrepancy(
  id: string | number,
  payload: ResolveDiscrepancyPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/discrepancies/${id}/resolve`, { method: 'POST', body: payload })
}

// ---------------------------------------------------------------------------
// Return Flow (section 13)
// ---------------------------------------------------------------------------

export interface ReturnQueueItem extends AnyRecord {
  id: number | string
  return_number: string
  request_id: string
  request_number?: string
  requester_name?: string
  department_name?: string
  due_date?: string | null
  expected_qty?: number
  warehouse_received_qty?: number
  outstanding_qty?: number
  status: 'PENDING_REQUESTER' | 'SUBMITTED' | 'COMPLETED'
}

export function getReturns(
  params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    department_id?: number | string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<ReturnQueueItem[]>> {
  return request('/api/returns', { params })
}

export function getReturnById(id: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/returns/${id}`)
}

export interface SubmitReturnItemPayload {
  return_item_id: number | string
  requester_return_qty: number
  note?: string | null
}

export interface SubmitReturnPayload {
  items: SubmitReturnItemPayload[]
}

export function submitReturn(
  id: string | number,
  payload: SubmitReturnPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/returns/${id}/submit`, { method: 'POST', body: payload })
}

export interface ReceiveReturnItemPayload {
  return_item_id: number | string
  warehouse_received_qty: number
  note?: string | null
}

export interface ReceiveReturnPayload {
  note?: string | null
  items: ReceiveReturnItemPayload[]
}

export function receiveReturn(
  id: string | number,
  payload: ReceiveReturnPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/returns/${id}/receive`, { method: 'POST', body: payload })
}

// ---------------------------------------------------------------------------
// Financial Closing — periods & Inventory Adjustment batches (section 17)
// ---------------------------------------------------------------------------

export interface FinancialPeriod extends AnyRecord {
  id: number | string
  period_key: string
  period_start: string
  period_end: string
  closing_date: string
  status: 'OPEN' | 'CLOSING' | 'CLOSED'
}

export interface InventoryAdjustmentBatchItem extends AnyRecord {
  id: number | string
  batch_id: number | string
  request_id: string
  request_number: string
  request_item_id: number | string
  item_code: string
  item_name: string
  actual_issued_qty: number | string
  returned_qty: number | string
  adjustment_qty: number | string
  source_warehouse_code: string | null
  loan_warehouse_code: string | null
  inventory_transfer_number: string | null
}

export interface InventoryAdjustmentBatch extends AnyRecord {
  id: number | string
  financial_period_id: number | string
  batch_number: string
  status: 'DRAFT' | 'POSTED'
  netsuite_reference: string | null
  note: string | null
  generated_at: string | null
  posted_at: string | null
  items?: InventoryAdjustmentBatchItem[]
}

export interface FinancialPeriodDetail extends FinancialPeriod {
  batches: InventoryAdjustmentBatch[]
}

export function getFinancialClosingPeriods(
  params: {
    page?: number
    limit?: number
    status?: string
    search?: string
    date_from?: string
    date_to?: string
    sort_order?: 'asc' | 'desc'
  } = {},
): Promise<PaginatedResponse<FinancialPeriod[]>> {
  return request('/api/financial-closing/periods', { params })
}

export function createFinancialClosingPeriod(
  payload: { period_key: string },
): Promise<ApiResponse<FinancialPeriodDetail>> {
  return request('/api/financial-closing/periods', { method: 'POST', body: payload })
}

export function getFinancialClosingPeriod(
  id: string | number,
): Promise<ApiResponse<FinancialPeriodDetail>> {
  return request(`/api/financial-closing/periods/${id}`)
}

export function startFinancialClosingPeriod(
  id: string | number,
): Promise<ApiResponse<FinancialPeriodDetail>> {
  return request(`/api/financial-closing/periods/${id}/start-closing`, { method: 'POST' })
}

export function generateInventoryAdjustmentBatch(
  id: string | number,
  payload: { note?: string | null } = {},
): Promise<ApiResponse<InventoryAdjustmentBatch>> {
  return request(`/api/financial-closing/periods/${id}/generate-batch`, { method: 'POST', body: payload })
}

export function closeFinancialClosingPeriod(
  id: string | number,
): Promise<ApiResponse<FinancialPeriodDetail>> {
  return request(`/api/financial-closing/periods/${id}/close`, { method: 'POST' })
}

export function getInventoryAdjustmentBatch(
  id: string | number,
): Promise<ApiResponse<InventoryAdjustmentBatch>> {
  return request(`/api/financial-closing/batches/${id}`)
}

export function postInventoryAdjustmentBatch(
  id: string | number,
  payload: { netsuite_reference: string },
): Promise<ApiResponse<InventoryAdjustmentBatch>> {
  return request(`/api/financial-closing/batches/${id}/post`, { method: 'POST', body: payload })
}
