export const AUTH_TOKEN_KEY = 'teachery_token'
export const AUTH_ROLE_KEY = 'teachery_role'
export const AUTH_USER_KEY = 'teachery_user'
export const AUTH_COOKIE_TOKEN = 'teachery_token'
export const AUTH_COOKIE_ROLE = 'teachery_role'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'guru'
  status: 'active' | 'inactive'
  credit_balance?: number
}

export type LoginResponse = {
  access_token: string
  user: AuthUser
}

export function setAuthSession(data: LoginResponse) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(AUTH_TOKEN_KEY, data.access_token)
  window.localStorage.setItem(AUTH_ROLE_KEY, data.user.role)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))

  const maxAge = 60 * 60 * 24
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_COOKIE_TOKEN}=${encodeURIComponent(data.access_token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
  document.cookie = `${AUTH_COOKIE_ROLE}=${encodeURIComponent(data.user.role)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_ROLE_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)

  document.cookie = `${AUTH_COOKIE_TOKEN}=; Path=/; Max-Age=0`
  document.cookie = `${AUTH_COOKIE_ROLE}=; Path=/; Max-Age=0`
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function dashboardPathFor(role?: string) {
  return role === 'admin' ? '/admin/dashboard' : '/assessments'
}
