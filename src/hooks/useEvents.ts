import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { EventDto, CreateEventRequest, ApiResponse } from '@/types'

export function useEvents(from?: string, to?: string) {
  return useQuery({
    queryKey: ['events', from, to],
    queryFn:  () => {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const qs  = params.toString()
      return api.get<ApiResponse<EventDto[]>>(`/api/events${qs ? '?' + qs : ''}`)
                .then(r => r.data.data)
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventRequest) =>
      api.post<ApiResponse<EventDto>>('/api/events', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventRequest) =>
      api.put<ApiResponse<EventDto>>(`/api/events/${id}`, data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
