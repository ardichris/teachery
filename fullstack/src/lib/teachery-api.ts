import { apiFetch } from '@/lib/api'

export type ApiSuccess<T> = {
  data: T
  meta?: Record<string, unknown>
}

export type ApiFailure = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiSuccess<T>> {
  const response = await apiFetch(path, init)
  const payload = (await response.json().catch(() => ({}))) as
    | ApiSuccess<T>
    | ApiFailure

  if (!response.ok || 'error' in payload) {
    throw new Error(
      'error' in payload ? payload.error.message : 'Request gagal diproses.'
    )
  }

  return payload
}
