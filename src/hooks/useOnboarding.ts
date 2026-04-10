import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface OnboardingItem {
  id:              string
  task:            string
  labelSv:         string
  sortOrder:       number
  completed:       boolean
  completedAt:     string | null
  completedByName: string | null
}

export function useOnboarding(employeeId: string) {
  return useQuery<OnboardingItem[]>({
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

    onMutate: async (itemId: string) => {
      await qc.cancelQueries({ queryKey: ['onboarding', employeeId] })

      const previous = qc.getQueryData(['onboarding', employeeId])

      qc.setQueryData(['onboarding', employeeId], (old: OnboardingItem[] | undefined) =>
        old?.map(item =>
          item.id === itemId
            ? { ...item, completed: !item.completed }
            : item
        ) ?? old
      )

      return { previous }
    },

    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        qc.setQueryData(['onboarding', employeeId], context.previous)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['onboarding', employeeId] })
    },
  })
}

export function useCompleteOnboarding(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.patch(`/api/employees/${employeeId}/onboarding/complete`)
         .then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', employeeId] }),
  })
}
