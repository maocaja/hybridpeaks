import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../../shared/hooks/useApi'

export interface WeeklyPlanSession {
  id?: string
  date: string
  type: 'STRENGTH' | 'ENDURANCE'
  title: string
  prescription: Record<string, unknown>
}

export interface WeeklyPlan {
  id: string
  weekStart: string
  notes?: string | null
  sessions: WeeklyPlanSession[]
}

export interface CreateWeeklyPlanDto {
  weekStart: string
  notes?: string
  sessions: Array<{
    date: string
    type: 'STRENGTH' | 'ENDURANCE'
    title: string
    prescription: Record<string, unknown>
  }>
}

export interface UpdateWeeklyPlanDto {
  notes?: string
  sessions?: Array<{
    date: string
    type: 'STRENGTH' | 'ENDURANCE'
    title: string
    prescription: Record<string, unknown>
  }>
}

/**
 * Fetch weekly plan for athlete and week
 */
export function useGetWeeklyPlan(athleteId: string | null, weekStart: string | null) {
  const apiFetch = useApi()
  
  return useQuery<WeeklyPlan | null>({
    queryKey: ['weeklyPlan', athleteId, weekStart],
    queryFn: async () => {
      if (!athleteId || !weekStart) {
        throw new Error('Athlete ID and week start are required')
      }
      try {
        return await apiFetch<WeeklyPlan>(`/api/coach/athletes/${athleteId}/weekly-plans?weekStart=${weekStart}`)
      } catch (error: any) {
        // If plan doesn't exist (404), return null instead of throwing
        // This is expected when no plan has been created for that week yet
        if (error?.status === 404) {
          return null
        }
        // Also check the response status if available
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!athleteId && !!weekStart,
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (plan doesn't exist)
      if (error?.status === 404 || error?.response?.status === 404) {
        return false
      }
      // Retry other errors up to 1 time
      return failureCount < 1
    },
  })
}

/**
 * Create new weekly plan
 */
export function useCreateWeeklyPlan() {
  const queryClient = useQueryClient()
  const apiFetch = useApi()

  return useMutation<WeeklyPlan, Error, { athleteId: string; data: CreateWeeklyPlanDto }>({
    mutationFn: async ({ athleteId, data }) => {
      return apiFetch<WeeklyPlan>(`/api/coach/athletes/${athleteId}/weekly-plans`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch weekly plan queries
      queryClient.invalidateQueries({
        queryKey: ['weeklyPlan', variables.athleteId, data.weekStart],
      })
    },
  })
}

/**
 * Update existing weekly plan
 */
export function useUpdateWeeklyPlan() {
  const queryClient = useQueryClient()
  const apiFetch = useApi()

  return useMutation<WeeklyPlan, Error, { planId: string; data: UpdateWeeklyPlanDto }>({
    mutationFn: async ({ planId, data }) => {
      return apiFetch<WeeklyPlan>(`/api/coach/weekly-plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      // Invalidate and refetch weekly plan queries
      queryClient.invalidateQueries({
        queryKey: ['weeklyPlan'],
      })
    },
  })
}

