import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { EventRsvpDto, RsvpStatus, ApiResponse } from '@/types'

export function useEventRsvp(eventId: string) {
  return useQuery({
    queryKey: ['rsvp', eventId],
    queryFn:  () =>
      api.get<ApiResponse<EventRsvpDto>>(`/api/events/${eventId}/rsvp`)
         .then(r => r.data.data),
    enabled: !!eventId,
  })
}

export function useSubmitRsvp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: RsvpStatus }) =>
      api.post<ApiResponse<EventRsvpDto>>(`/api/events/${eventId}/rsvp`, { status })
         .then(r => r.data.data),
    onSuccess: (data, { eventId }) => {
      qc.setQueryData(['rsvp', eventId], data)
    },
  })
}
