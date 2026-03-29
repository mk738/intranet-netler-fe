import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Employee, BankInfo, Education, Assignment, BenefitDto, ApiResponse } from '@/types'

// ── Extended detail response ──────────────────────────────────

export interface EmployeeDetail extends Employee {
  bankInfo:          BankInfo | null
  education:         Education[]
  assignments:       Assignment[]
  currentAssignment: Assignment | null
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


export function useUploadAvatar(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post<ApiResponse<Employee>>(
        `/api/employees/${id}/avatar`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      ).then(r => r.data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useTerminateEmployee(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (terminationDate: string) =>
      api.put<ApiResponse<Employee>>(`/api/employees/${id}/terminate`, { terminationDate })
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateEmployeeRole(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (role: 'ADMIN' | 'EMPLOYEE') =>
      api.put<ApiResponse<Employee>>(`/api/employees/${id}/role`, { role })
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useSetEmployeeActive(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) =>
      api.put<ApiResponse<Employee>>(`/api/employees/${id}/active`, { active })
         .then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', id] })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
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

export function useBenefits(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'benefits'],
    queryFn:  () =>
      api.get<ApiResponse<BenefitDto[]>>(`/api/employees/${employeeId}/benefits`)
         .then(r => r.data.data),
    enabled: !!employeeId,
    retry: false,
  })
}

export function useUpsertBenefits(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (benefits: Array<{ name: string; description: string | null }>) =>
      api.put<ApiResponse<BenefitDto[]>>(
        `/api/employees/${employeeId}/benefits`,
        benefits
      ).then(r => r.data.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['employees', employeeId, 'benefits'] }),
  })
}

export function useContract(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'contract'],
    queryFn:  () =>
      api.get<ApiResponse<{ downloadUrl: string }>>(
        `/api/employees/${employeeId}/contract`
      ).then(r => r.data.data),
    enabled: !!employeeId,
    retry: false,
  })
}

export function useUploadContract(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/api/employees/${employeeId}/contract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['employees', employeeId, 'contract'] }),
  })
}

export function useCV(employeeId: string) {
  return useQuery({
    queryKey: ['employees', employeeId, 'cv'],
    queryFn:  () =>
      api.get<ApiResponse<{ downloadUrl: string }>>(
        `/api/employees/${employeeId}/cv`
      ).then(r => r.data.data),
    enabled: !!employeeId,
    retry: false,
  })
}

export function useUploadCV(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/api/employees/${employeeId}/cv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['employees', employeeId, 'cv'] }),
  })
}
