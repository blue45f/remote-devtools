import { apiClient } from '@/shared/api'
import type { UserProfile, UpdateUserInfoRequest } from '../types'

export async function getUserInfo(empNo: string): Promise<UserProfile> {
  return apiClient.get<UserProfile>(`/api/user-profile/${empNo}`)
}

export async function updateUserInfo(
  empNo: string,
  data: UpdateUserInfoRequest
): Promise<UserProfile> {
  return apiClient.put<UserProfile>(`/api/user-profile/${empNo}`, data)
}

export async function createUserInfo(
  data: UpdateUserInfoRequest & { empNo: string }
): Promise<UserProfile> {
  return apiClient.post<UserProfile>('/api/user-profile', data)
}
