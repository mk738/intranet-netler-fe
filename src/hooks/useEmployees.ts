import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Employee, BankInfo, Education, Assignment, ApiResponse } from '@/types'

// ── Extended detail response ──────────────────────────────────

export interface EmployeeDetail extends Employee {
  bankInfo:    BankInfo | null
  education:   Education[]
  assignments: Assignment[]
}

// ── Queries ───────────────────────────────────────────────────

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn:  () =>
      api.get<ApiResponse<Employee[]>>('/api/employees')
         .then(r => r.data.data),
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn:  () =>
      api.get<ApiResponse<EmployeeDetail>>(`/api/employees/${id}`)
         .then(r => r.data.data),
    enabled: !!id,
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['employees', 'me'],
    queryFn:  () =>
      api.get<ApiResponse<EmployeeDetail>>('/api/employees/me')
         .then(r => r.data.data),
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Employee['profile']>) =>
      api.put<ApiResponse<Employee>>('/api/employees/me/profile', data)
         .then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'me'] }),
  })
}

export function useUpdateMyBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BankInfo) =>
      api.put<ApiResponse<Employee>>('/api/employees/me/bank', data)
         .then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'me'] }),
  })
}

export function useAddEducation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Education, 'id'>) =>
      api.post<ApiResponse<Education>>('/api/employees/me/education', data)
         .then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'me'] }),
  })
}

export function useDeleteEducation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/employees/me/education/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'me'] }),
  })
}

export function useInviteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      firstName: string
      lastName:  string
      email:     string
      jobTitle?: string
      role:      'ADMIN' | 'EMPLOYEE'
      startDate?: string
    }) =>
      api.post<ApiResponse<Employee>>('/api/employees', data)
         .then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useUpdateEmployeeProfile(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Employee['profile']>) =>
      api.put<ApiResponse<Employee>>(`/api/employees/${id}/profile`, data)
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
