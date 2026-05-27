import { useCallback } from 'react'
import { logout } from '../api'
import { useUser } from './useUser'

interface UseLogoutResult {
  handleLogout: () => Promise<void>
  isLoggingOut: boolean
}

export function useLogout(): UseLogoutResult {
  const { clearUser } = useUser()

  const handleLogout = useCallback(async () => {
    clearUser()
    await logout()
  }, [clearUser])

  return {
    handleLogout,
    isLoggingOut: false,
  }
}
