import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Category, CategoryType, CreateCategoryRequest, ApiResponse } from '@/types'

export function useCategories(type: CategoryType) {
  return useQuery({
    queryKey: ['categories', type],
    queryFn:  () =>
      api.get<ApiResponse<Category[]>>(`/api/categories?type=${type}`).then(r => r.data.data),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) =>
      api.post<ApiResponse<Category>>('/api/categories', data).then(r => r.data.data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['categories', vars.type] }),
  })
}

export function useUpdateCategory(id: string, type: CategoryType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.put<ApiResponse<Category>>(`/api/categories/${id}`, { name }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', type] }),
  })
}

export function useDeleteCategory(type: CategoryType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', type] }),
  })
}
