import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../shared/hooks/useApi'

export interface Exercise {
  id: string
  name: string
  type: 'STRENGTH' | 'ENDURANCE'
  modality?: string
  description?: string
}

/**
 * Fetch exercises with optional search
 */
export function useGetExercises(search?: string) {
  const apiFetch = useApi()
  
  return useQuery<Exercise[]>({
    queryKey: ['exercises', search],
    queryFn: async () => {
      const url = search
        ? `/api/exercises?search=${encodeURIComponent(search)}`
        : '/api/exercises'
      return apiFetch<Exercise[]>(url)
    },
    staleTime: 300000, // 5 minutes (exercises don't change often)
    enabled: true, // Always enabled, search can be empty
  })
}

