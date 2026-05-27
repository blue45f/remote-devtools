import { useState, useEffect, useCallback } from 'react'
import { isAuthEnabled } from '@/shared/constants'
import { validateSession } from '../api'
import type { SessionInfo, AuthUser } from '../types'

interface UseSessionResult {
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  error: Error | null
  refresh: () => Promise<void>
}

export function useSession(): UseSessionResult {
  const [isLoading, setIsLoading] = useState(true)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    isValid: false,
    user: null,
    expiresAt: null,
  })
  const [error, setError] = useState<Error | null>(null)

  const checkSession = useCallback(async () => {
    if (!isAuthEnabled()) {
      setSessionInfo({
        isValid: true,
        user: null,
        expiresAt: null,
      })
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const result = await validateSession()
      setSessionInfo(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Session check failed'))
      setSessionInfo({
        isValid: false,
        user: null,
        expiresAt: null,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    isLoading,
    isAuthenticated: sessionInfo.isValid,
    user: sessionInfo.user,
    error,
    refresh: checkSession,
  }
}
