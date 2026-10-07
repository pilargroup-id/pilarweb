import { reactive, readonly } from 'vue'

const TOKEN_KEY = 'auth_token'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export interface AuthUser {
  id: string | number
  name?: string
  full_name?: string
  display_name?: string
  username?: string
  email?: string
  apps?: string[]
  job_level?: string
  job_level_value?: number
  [key: string]: unknown
}

export interface AuthCapabilities {
  can_create_request: boolean
  can_approve_department: boolean
  finance_access: boolean
  warehouse_access: boolean
  admin_access: boolean
  approval_rule_configured: boolean
}

interface AuthState {
  user: AuthUser | null
  capabilities: AuthCapabilities | null
  isLoading: boolean
  isReady: boolean
}

const state = reactive<AuthState>({
  user: null,
  capabilities: null,
  isLoading: false,
  isReady: false,
})

export const authState = readonly(state)

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface AuthMeResponse {
  success: boolean
  message: string
  data: AuthUser
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken()

  state.isLoading = true
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, { headers })

    if (response.status === 401) {
      clearToken()
      state.user = null
      return null
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch current user (${response.status})`)
    }

    const result: AuthMeResponse = await response.json()
    state.user = result.data
    return state.user
  } finally {
    state.isLoading = false
    state.isReady = true
  }
}

interface AuthCapabilitiesResponse {
  success: boolean
  message: string
  data: AuthCapabilities
}

export async function fetchCapabilities(): Promise<AuthCapabilities | null> {
  const token = getToken()

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}/api/auth/capabilities`, { headers })

  if (response.status === 401) {
    clearToken()
    state.capabilities = null
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch capabilities (${response.status})`)
  }

  const result: AuthCapabilitiesResponse = await response.json()
  state.capabilities = result.data
  return state.capabilities
}

export function logout(): void {
  clearToken()
  state.user = null
  state.capabilities = null
  state.isReady = false
}

export function getDisplayName(user: AuthUser | null = state.user): string {
  if (!user) return 'Guest'
  return (
    user.name ||
    user.full_name ||
    user.display_name ||
    user.username ||
    user.email ||
    'Guest'
  )
}

export function getDisplayEmail(user: AuthUser | null = state.user): string {
  if (!user) return ''
  return user.email || user.username || ''
}

export function isManager(user: AuthUser | null = state.user): boolean {
  return String(user?.job_level ?? '').trim().toLowerCase() === 'manager'
}
