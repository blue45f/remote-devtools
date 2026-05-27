import { useLocalStorage } from '@/shared/hooks'
import type { AuthUser } from '../types'

const STORAGE_KEY = 'auth_user'

interface UseUserResult {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
  empNo: string | null
}

export function useUser(): UseUserResult {
  const [user, setUser, clearUser] = useLocalStorage<AuthUser | null>(
    STORAGE_KEY,
    null
  )

  return {
    user,
    setUser,
    clearUser,
    empNo: user?.empNo || null,
  }
}
