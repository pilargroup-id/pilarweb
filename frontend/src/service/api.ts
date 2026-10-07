import { getToken, clearToken } from './auth'

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

export interface WorkflowDefinition extends AnyRecord {
  id: number | string
}

export interface PurposeWorkflowAssignment extends AnyRecord {
  id: number | string
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
  workflows: WorkflowDefinition[]
  purpose_workflow_assignments: PurposeWorkflowAssignment[]
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

export function getWorkflows(): Promise<ApiResponse<WorkflowDefinition[]>> {
  return request('/api/master/workflows')
}

export function getPurposeWorkflows(): Promise<ApiResponse<PurposeWorkflowAssignment[]>> {
  return request('/api/master/purpose-workflows')
}

export interface AssignPurposeWorkflowPayload {
  request_purpose_id: string | number
  workflow_definition_id: string | number
}

export function assignPurposeWorkflow(
  payload: AssignPurposeWorkflowPayload,
): Promise<ApiResponse<{ id: number | string }>> {
  return request('/api/master/purpose-workflows', { method: 'POST', body: payload })
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
  return_due_date?: string
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
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResponse<PilarwebRequest[]>> {
  return request('/api/requests', { params })
}

export function getRequestById(id: string): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${id}`)
}

export function submitRequest(id: string): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${id}/submit`, { method: 'POST' })
}

export interface UpdateRequestPayload {
  request_purpose_id?: string | number
  reason?: string
  return_due_date?: string | null
}

export function updateRequest(
  id: string,
  payload: UpdateRequestPayload,
): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${id}`, { method: 'PUT', body: payload })
}

export function cancelRequestItem(
  requestId: string,
  itemId: string | number,
  payload: { reason: string },
): Promise<ApiResponse<PilarwebRequest>> {
  return request(`/api/requests/${requestId}/items/${itemId}/cancel`, { method: 'POST', body: payload })
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
  params: { page?: number; limit?: number; search?: string } = {},
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

export function rejectApproval(
  id: number | string,
  payload: { reason: string },
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/approvals/${id}/reject`, { method: 'POST', body: payload })
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
  params: { page?: number; limit?: number; search?: string } = {},
): Promise<PaginatedResponse<FinanceQueueItem[]>> {
  return request('/api/finance/requests', { params })
}

export function getFinanceRequestById(requestId: string): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/finance/requests/${requestId}`)
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

// ---------------------------------------------------------------------------
// Warehouse Queue and Fulfillment (section 10)
// ---------------------------------------------------------------------------

export interface WarehouseQueueItem extends AnyRecord {
  id: string
  request_number: string
  status: string
}

export function getWarehouseQueue(
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
): Promise<PaginatedResponse<WarehouseQueueItem[]>> {
  return request('/api/warehouse/requests', { params })
}

export function getWarehouseRequestDetail(requestId: string): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/requests/${requestId}`)
}

export interface HandoverRecord extends AnyRecord {
  handover_id: number
  handover_status: 'PENDING' | 'HANDED_OVER' | 'RECEIVED'
  request_id: string
  request_number: string
  fulfillment_id: number
  fulfillment_number: string
}

export function getWarehouseHandovers(
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
): Promise<PaginatedResponse<HandoverRecord[]>> {
  return request('/api/warehouse/handovers', { params })
}

export function acceptWarehouseRequest(requestId: string): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/requests/${requestId}/accept`, { method: 'POST' })
}

export function printFulfillment(fulfillmentId: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/print`, { method: 'POST' })
}

export interface UpdateFulfillmentItemPayload {
  actual_qty: number
  shortage_reason_code?: string | null
  remainder_disposition?: string | null
  shortage_note?: string | null
}

export function updateFulfillmentItem(
  fulfillmentId: string | number,
  fulfillmentItemId: string | number,
  payload: UpdateFulfillmentItemPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/items/${fulfillmentItemId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function confirmFulfillmentPicking(fulfillmentId: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/confirm-picking`, { method: 'POST' })
}

// ---------------------------------------------------------------------------
// NetSuite Inventory Transfer (section 11)
// ---------------------------------------------------------------------------

export interface InventoryTransferItemPayload {
  fulfillment_item_id: string | number
  transferred_qty: number
}

export interface InventoryTransferPayload {
  inventory_transfer_number: string
  source_warehouse_code: string
  transfer_date: string
  note?: string | null
  items: InventoryTransferItemPayload[]
}

export function createInventoryTransfer(
  fulfillmentId: string | number,
  payload: InventoryTransferPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/inventory-transfers`, {
    method: 'POST',
    body: payload,
  })
}

export interface UpdateInventoryTransferPayload {
  inventory_transfer_number?: string
  source_warehouse_code?: string
  transfer_date?: string
  note?: string | null
}

export function updateInventoryTransfer(
  transferId: string | number,
  payload: UpdateInventoryTransferPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/inventory-transfers/${transferId}`, { method: 'PUT', body: payload })
}

export function deleteInventoryTransfer(transferId: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/inventory-transfers/${transferId}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Handover (section 12)
// ---------------------------------------------------------------------------

export function handoverFulfillment(
  fulfillmentId: string | number,
  payload: { note?: string | null } = {},
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/fulfillments/${fulfillmentId}/handover`, { method: 'POST', body: payload })
}

export function receiveHandover(
  handoverId: string | number,
  payload: { note?: string | null } = {},
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/warehouse/handovers/${handoverId}/receive`, { method: 'POST', body: payload })
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
  status: 'SUBMITTED' | 'RECEIVED' | 'COMPLETED'
}

export function getReturns(
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
): Promise<PaginatedResponse<ReturnQueueItem[]>> {
  return request('/api/returns', { params })
}

export interface CreateReturnItemPayload {
  request_item_id: number | string
  returned_qty: number
}

export interface CreateReturnPayload {
  request_id: string
  note?: string | null
  items: CreateReturnItemPayload[]
}

export function createReturn(payload: CreateReturnPayload): Promise<ApiResponse<AnyRecord>> {
  return request('/api/returns', { method: 'POST', body: payload })
}

export function getReturnById(id: string | number): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/returns/${id}`)
}

export function receiveReturn(
  id: string | number,
  payload: { note?: string | null } = {},
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/returns/${id}/receive`, { method: 'POST', body: payload })
}

export interface ReturnInspectionItemPayload {
  return_item_id: number | string
  condition_code: 'GOOD' | 'DAMAGED' | 'MISSING' | 'OTHER'
  condition_note?: string | null
  stock_returned_qty: number
}

export interface InspectReturnPayload {
  note?: string | null
  items: ReturnInspectionItemPayload[]
}

export function inspectReturn(
  id: string | number,
  payload: InspectReturnPayload,
): Promise<ApiResponse<AnyRecord>> {
  return request(`/api/returns/${id}/inspect`, { method: 'POST', body: payload })
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
  params: { page?: number; limit?: number; status?: string } = {},
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
