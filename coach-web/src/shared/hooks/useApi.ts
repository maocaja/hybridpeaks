import { useCallback } from 'react'

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  const keys = ['authToken', 'accessToken', 'token']
  for (const key of keys) {
    const token = localStorage.getItem(key)
    if (token) return token
  }
  return null
}

/**
 * Base API fetch function with authentication
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, { ...options, headers })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.message || `Request failed: ${response.statusText}`)
    // Add status code to error for better handling
    ;(error as any).status = response.status
    ;(error as any).response = response
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/**
 * Hook for making API calls
 * Returns a memoized apiFetch function
 */
export function useApi() {
  return useCallback(apiFetch, [])
}

