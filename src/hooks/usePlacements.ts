import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PlacementViewDto, CreateAssignmentRequest, ApiResponse } from '@/types'

export function usePlacements() {
  return useQuery({
    queryKey: ['placements'],
    queryFn:  () =>
      api.get<ApiResponse<PlacementViewDto>>('/api/placements')
         .then(r => r.data.data),
  })
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssignmentRequest) =>
      api.post<ApiResponse<unknown>>('/api/assignments', data)
         .then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placements'] })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useEndAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate?: string }) =>
      api.put<ApiResponse<unknown>>(`/api/assignments/${id}/end`, { endDate: endDate ?? null })
         .then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placements'] })
    },
  })
}
