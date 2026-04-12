import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface HardwareItem {
  id:        string
  name:      string
  createdAt: string
}

export function useHardware(employeeId: string) {
  return useQuery<HardwareItem[]>({
    queryKey: ['hardware', employeeId],
    queryFn: () =>
      api.get(`/api/employees/${employeeId}/hardware`)
         .then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useAddHardware(employeeId: string) {
  const qc = useQueryClient()
  return useMutation<HardwareItem, Error, string>({
    mutationFn: (name: string) =>
      api.post(`/api/employees/${employeeId}/hardware`, { name })
         .then(r => r.data.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['hardware', employeeId] }),
  })
}

export function useRemoveHardware(employeeId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (hardwareId: string) =>
      api.delete(`/api/employees/${employeeId}/hardware/${hardwareId}`)
         .then(r => r.data.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['hardware', employeeId] }),
  })
}
