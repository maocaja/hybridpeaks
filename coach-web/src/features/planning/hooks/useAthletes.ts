import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../shared/hooks/useApi'

export interface Athlete {
  id: string
  email: string
  linkedAt: string
}

/**
 * Fetch coach's athlete roster
 */
export function useGetAthletes() {
  const apiFetch = useApi()
  
  return useQuery<Athlete[]>({
    queryKey: ['athletes'],
    queryFn: async () => {
      return apiFetch<Athlete[]>('/api/coach/athletes')
    },
    staleTime: 60000, // 1 minute
  })
}

