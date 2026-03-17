import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { FaqItem, CreateFaqRequest, ApiResponse } from '@/types'

export function useFaqItems() {
  return useQuery({
    queryKey: ['faq'],
    queryFn:  () =>
      api.get<ApiResponse<FaqItem[]>>('/api/faq').then(r => r.data.data),
  })
}

export function useCreateFaqItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFaqRequest) =>
      api.post<ApiResponse<FaqItem>>('/api/faq', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq'] }),
  })
}

export function useUpdateFaqItem(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFaqRequest) =>
      api.put<ApiResponse<FaqItem>>(`/api/faq/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq'] }),
  })
}

export function useDeleteFaqItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/faq/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq'] }),
  })
}
