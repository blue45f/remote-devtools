import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { getUserInfo, updateUserInfo } from '../api'
import type { UpdateUserInfoRequest } from '../types'

export function useUserInfo(empNo: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['userInfo', empNo],
    queryFn: () => getUserInfo(empNo!),
    enabled: !!empNo,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateUserInfoRequest) =>
      updateUserInfo(empNo!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userInfo', empNo] })
      message.success('저장되었습니다')
    },
    onError: (error) => {
      console.error('Failed to update user info:', error)
      message.error('저장에 실패했습니다')
    },
  })

  return {
    userInfo: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateUserInfo: mutation.mutate,
    isUpdating: mutation.isPending,
  }
}
