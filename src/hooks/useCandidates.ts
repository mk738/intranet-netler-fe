import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { CandidateDto, CreateCandidateRequest, PatchCandidateRequest, ApiResponse } from '@/types'

export function useCandidates() {
  return useQuery({
    queryKey: ['candidates'],
    queryFn:  () =>
      api.get<ApiResponse<CandidateDto[]>>('/api/candidates')
         .then(r => r.data.data),
  })
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCandidateRequest) =>
      api.post<ApiResponse<CandidateDto>>('/api/candidates', data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

export function usePatchCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PatchCandidateRequest }) =>
      api.patch<ApiResponse<CandidateDto>>(`/api/candidates/${id}`, data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

export function useDeleteCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/candidates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}
