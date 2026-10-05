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

export function getWorkflows(): Promise<ApiResponse<WorkflowDefinition[]>> {
  return request('/api/master/workflows')
}

export function getPurposeWorkflows(): Promise<ApiResponse<PurposeWorkflowAssignment[]>> {
  return request('/api/master/purpose-workflows')
}

export function getApprovalRules(
  departmentId?: string | number,
): Promise<ApiResponse<ApprovalRule[]>> {
  return request('/api/master/approval-rules', {
    params: departmentId !== undefined ? { department_id: departmentId } : undefined,
  })
}

export function getWarehouseLocations(): Promise<ApiResponse<WarehouseLocation[]>> {
  return request('/api/master/warehouse-locations')
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
