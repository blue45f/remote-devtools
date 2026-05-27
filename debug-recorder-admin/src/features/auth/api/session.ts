import { CONFIG, isAuthEnabled } from '@/shared/constants'
import type { AuthUser, SessionInfo } from '../types'

const AUTH_HOST = CONFIG.ADMIN_BFF_HOST

export async function validateSession(): Promise<SessionInfo> {
  if (!isAuthEnabled()) {
    return {
      isValid: true,
      user: null,
      expiresAt: null,
    }
  }

  try {
    const response = await fetch(`${AUTH_HOST}/api/auth/session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return {
        isValid: false,
        user: null,
        expiresAt: null,
      }
    }

    const data: AuthUser = await response.json()

    if (data.error) {
      return {
        isValid: false,
        user: null,
        expiresAt: null,
      }
    }

    return {
      isValid: true,
      user: data,
      expiresAt: data.expiresAt,
    }
  } catch (error) {
    console.error('Session validation failed:', error)
    return {
      isValid: false,
      user: null,
      expiresAt: null,
    }
  }
}

export async function logout(): Promise<void> {
  if (!isAuthEnabled()) {
    return
  }

  try {
    const response = await fetch(`${AUTH_HOST}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
    }

    window.location.href = `${AUTH_HOST}/login`
  } catch (error) {
    console.error('Logout failed:', error)
    window.location.href = `${AUTH_HOST}/login`
  }
}
