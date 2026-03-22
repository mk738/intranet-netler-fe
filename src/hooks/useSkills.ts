import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SkillDto, ApiResponse } from '@/types'

// ── Global catalog ─────────────────────────────────────────────

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn:  () =>
      api.get<ApiResponse<SkillDto[]>>('/api/skills')
         .then(r => r.data.data),
  })
}

// ── Per-employee ───────────────────────────────────────────────

export function useEmployeeSkills(employeeId: string) {
  return useQuery({
    queryKey: ['skills', 'employees', employeeId],
    queryFn:  () =>
      api.get<ApiResponse<SkillDto[]>>(`/api/skills/employees/${employeeId}`)
         .then(r => r.data.data),
    enabled: !!employeeId,
  })
}

export function useSetEmployeeSkills(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (names: string[]) =>
      api.post<ApiResponse<SkillDto[]>>(
        `/api/skills/employees/${employeeId}`,
        { names }
      ).then(r => r.data.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['skills', 'employees', employeeId] }),
  })
}
