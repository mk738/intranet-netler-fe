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

export interface OnboardingChecklistDto {
  onboardingComplete: boolean
  items:              OnboardingItem[]
}

export function useOnboarding(employeeId: string) {
  return useQuery<OnboardingChecklistDto>({
    queryKey: ['onboarding', employeeId],
    queryFn: () =>
      api.get(`/api/employees/${employeeId}/onboarding`)
         .then(r => r.data.data ?? { onboardingComplete: false, items: [] }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useToggleOnboardingItem(employeeId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) =>
      api.patch(`/api/employees/${employeeId}/onboarding/${itemId}/toggle`)
         .then(r => r.data.data as OnboardingChecklistDto),

    onMutate: async (itemId: string) => {
      await qc.cancelQueries({ queryKey: ['onboarding', employeeId] })

      const previous = qc.getQueryData<OnboardingChecklistDto>(['onboarding', employeeId])

      qc.setQueryData(['onboarding', employeeId], (old: OnboardingChecklistDto | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map(item =>
            item.id === itemId
              ? { ...item, completed: !item.completed }
              : item
          ),
        }
      })

      return { previous }
    },

    onError: (_err, _itemId, context) => {
      if (context?.previous) {
        qc.setQueryData(['onboarding', employeeId], context.previous)
      }
    },

    onSuccess: (dto: OnboardingChecklistDto) => {
      qc.setQueryData(['onboarding', employeeId], dto)
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
         .then(r => r.data.data as OnboardingChecklistDto),
    onSuccess: (dto: OnboardingChecklistDto) => {
      qc.setQueryData(['onboarding', employeeId], dto)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['onboarding', employeeId] })
    },
  })
}
