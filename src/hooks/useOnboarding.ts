import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface OnboardingItem {
  id:              string
  task:            string
  completed:       boolean
  completedAt:     string | null
  completedByName: string | null
}

export function useOnboarding(employeeId: string) {
  return useQuery({
    queryKey: ['onboarding', employeeId],
    queryFn: () =>
      api.get(`/api/employees/${employeeId}/onboarding`)
         .then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useToggleOnboardingItem(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) =>
      api.patch(`/api/employees/${employeeId}/onboarding/${itemId}/toggle`)
         .then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', employeeId] }),
  })
}
