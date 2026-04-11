import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface OnboardingTemplateItem {
  id:        string
  taskKey:   string
  labelSv:   string
  sortOrder: number
  active:    boolean
}

export function useOnboardingTemplate() {
  return useQuery<OnboardingTemplateItem[]>({
    queryKey: ['onboarding-template'],
    queryFn: () => api.get('/api/onboarding/template').then(r => r.data.data ?? []),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useCreateTemplateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { taskKey: string; labelSv: string }) =>
      api.post('/api/onboarding/template', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding-template'] }),
  })
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; labelSv?: string; sortOrder?: number; active?: boolean }) =>
      api.patch(`/api/onboarding/template/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding-template'] }),
  })
}

export function useDeleteTemplateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/onboarding/template/${id}`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding-template'] }),
  })
}
