import { clearAuthSession, getStoredToken } from '@/lib/auth'

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? '/api'
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })

  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuthSession()
    const currentPath = `${window.location.pathname}${window.location.search}`
    const loginUrl = new URL('/auth/login', window.location.origin)
    if (currentPath && currentPath !== '/auth/login') {
      loginUrl.searchParams.set('from', currentPath)
    }
    window.location.replace(loginUrl.toString())

    return new Promise<Response>(() => {})
  }

  return response
}
