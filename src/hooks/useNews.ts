import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  NewsListDto,
  NewsPostDetailDto,
  CreateNewsRequest,
  ApiResponse,
} from '@/types'

export function useNewsFeed(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: ['news', page, size],
    queryFn:  () =>
      api.get<ApiResponse<NewsListDto>>(`/api/news?page=${page}&size=${size}`)
         .then(r => r.data.data),
  })
}

export function useNewsPost(id: string) {
  return useQuery({
    queryKey: ['news', id],
    queryFn:  () =>
      api.get<ApiResponse<NewsPostDetailDto>>(`/api/news/${id}`)
         .then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateNews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNewsRequest) =>
      api.post<ApiResponse<NewsPostDetailDto>>('/api/news', data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news'] })
    },
  })
}

export function useUpdateNews(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateNewsRequest) =>
      api.put<ApiResponse<NewsPostDetailDto>>(`/api/news/${id}`, data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['news', id] })
      qc.invalidateQueries({ queryKey: ['news'] })
    },
  })
}

export function usePublishNews(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.put<ApiResponse<NewsPostDetailDto>>(`/api/news/${id}/publish`, { publish: true })
         .then(r => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['news', updated.id], updated)
      qc.invalidateQueries({ queryKey: ['news'] })
    },
  })
}

export function useDeleteNews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/news/${id}`),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ['news', id] })
      qc.invalidateQueries({ queryKey: ['news'] })
    },
  })
}
