import { useQuery } from '@tanstack/react-query'
import { getWorkflowMembers } from '../api'

export function useWorkflowMembers() {
  const query = useQuery({
    queryKey: ['workflow', 'members'],
    queryFn: getWorkflowMembers,
    staleTime: 10 * 60 * 1000,
  })

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
