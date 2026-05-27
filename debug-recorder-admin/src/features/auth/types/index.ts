export interface AuthUserPermissionGroup {
  id: string
  name: string
  permissions: string[]
}

export interface AuthUser {
  displayUsername: string
  username: string
  empNo: string
  email: string
  sessionId: string
  organization: string
  position: string
  accessedAt: string
  expiresAt: string
  permissionGroupList: AuthUserPermissionGroup[]
  error?: {
    code: string
    message: string
  }
}

export interface SessionInfo {
  isValid: boolean
  user: AuthUser | null
  expiresAt: string | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LogoutResponse {
  success: boolean
  redirectUrl?: string
}
