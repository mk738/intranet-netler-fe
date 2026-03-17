import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ClientDto, NewClientDto, UpdateClientRequest, ApiResponse } from '@/types'

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn:  () =>
      api.get<ApiResponse<ClientDto[]>>('/api/clients')
         .then(r => r.data.data),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn:  () =>
      api.get<ApiResponse<ClientDto>>(`/api/clients/${id}`)
         .then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NewClientDto) =>
      api.post<ApiResponse<ClientDto>>('/api/clients', data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateClientRequest) =>
      api.put<ApiResponse<ClientDto>>(`/api/clients/${id}`, data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
