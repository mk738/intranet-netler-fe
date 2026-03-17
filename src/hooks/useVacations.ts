import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  VacationDto,
  VacationSummaryDto,
  SubmitVacationRequest,
  ReviewVacationRequest,
  ApiResponse,
} from '@/types'

export function useMyVacations() {
  return useQuery({
    queryKey: ['vacations', 'me'],
    queryFn:  () =>
      api.get<ApiResponse<VacationDto[]>>('/api/vacations/me')
         .then(r => r.data.data),
  })
}

export function useAllVacations(status?: string) {
  return useQuery({
    queryKey: ['vacations', 'all', status ?? 'all'],
    queryFn:  () => {
      const url = status ? `/api/vacations?status=${status}` : '/api/vacations'
      return api.get<ApiResponse<VacationDto[]>>(url).then(r => r.data.data)
    },
  })
}

export function useVacationSummary() {
  return useQuery({
    queryKey: ['vacations', 'summary'],
    queryFn:  () =>
      api.get<ApiResponse<VacationSummaryDto>>('/api/vacations/summary')
         .then(r => r.data.data),
  })
}

export function useSubmitVacation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SubmitVacationRequest) =>
      api.post<ApiResponse<VacationDto>>('/api/vacations', data)
         .then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vacations', 'me'] })
    },
  })
}

export function useCancelVacation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/vacations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vacations', 'me'] })
    },
  })
}

export function useReviewVacation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewVacationRequest }) =>
      api.put<ApiResponse<VacationDto>>(`/api/vacations/${id}/review`, data)
         .then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vacations', 'all'] })
      qc.invalidateQueries({ queryKey: ['vacations', 'summary'] })
    },
  })
}
