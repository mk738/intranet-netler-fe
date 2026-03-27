import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useEmployees, useUpdateEmployeeRole, useSetEmployeeActive } from '@/hooks/useEmployees'
import { useToast } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'
import { Modal, Button, Spinner } from '@/components/ui'
import type { Employee, Role } from '@/types'

// ── Role badge ──────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  if (role === 'SUPERADMIN')
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900/40 text-amber-300 border border-amber-500/20">Superadmin</span>
  if (role === 'ADMIN')
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-bg text-purple-light border border-purple/20">Admin</span>
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-bg-hover text-text-2 border border-subtle">Anställd</span>
}

// ── Confirm modal ───────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onClose,
  loading,
}: {
  message: string
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <Modal
      title="Bekräfta ändring"
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={onConfirm} loading={loading}>Bekräfta</Button>
        </>
      }
    >
      <p className="text-sm text-text-2">{message}</p>
    </Modal>
  )
}

// ── Role row ───────────────────────────────────────────────────

function EmployeeRow({
  emp,
  currentUserId,
}: {
  emp: Employee
  currentUserId: string
}) {
  const { showToast } = useToast()
  const roleMut   = useUpdateEmployeeRole(emp.id)
  const activeMut = useSetEmployeeActive(emp.id)

  const [roleConfirm,   setRoleConfirm]   = useState<'ADMIN' | 'EMPLOYEE' | null>(null)
  const [activeConfirm, setActiveConfirm] = useState<boolean | null>(null)

  const isSelf = emp.id === currentUserId
  const name   = emp.profile
    ? `${emp.profile.firstName} ${emp.profile.lastName}`
    : emp.email

  function confirmRole() {
    if (roleConfirm === null) return
    roleMut.mutate(roleConfirm, {
      onSuccess: () => {
        showToast(`${name} är nu ${roleConfirm === 'ADMIN' ? 'Admin' : 'Anställd'}`, 'success')
        setRoleConfirm(null)
      },
      onError: () => {
        showToast('Något gick fel', 'error')
        setRoleConfirm(null)
      },
    })
  }

  function confirmActive() {
    if (activeConfirm === null) return
    activeMut.mutate(activeConfirm, {
      onSuccess: () => {
        showToast(`${name} är nu ${activeConfirm ? 'aktiverad' : 'inaktiverad'}`, 'success')
        setActiveConfirm(null)
      },
      onError: () => {
        showToast('Något gick fel', 'error')
        setActiveConfirm(null)
      },
    })
  }

  return (
    <>
      <tr className="border-b border-subtle last:border-0 hover:bg-bg-hover/50 transition-colors">
        {/* Employee */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={name} avatarUrl={emp.profile?.avatarUrl ?? null} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-1 truncate">{name}</p>
              <p className="text-xs text-text-3 truncate">{emp.email}</p>
            </div>
          </div>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <RoleBadge role={emp.role} />
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span className={emp.isActive ? 'badge-active' : 'badge-unplaced'}>
            {emp.isActive ? 'Aktiv' : 'Inaktiv'}
          </span>
        </td>

        {/* Role action */}
        <td className="px-4 py-3">
          {emp.role === 'SUPERADMIN' || isSelf ? (
            <span className="text-xs text-text-3">—</span>
          ) : emp.role === 'ADMIN' ? (
            <button
              onClick={() => setRoleConfirm('EMPLOYEE')}
              className="text-xs font-medium text-warning hover:underline"
            >
              Degradera till Anställd
            </button>
          ) : (
            <button
              onClick={() => setRoleConfirm('ADMIN')}
              className="text-xs font-medium text-purple-light hover:underline"
            >
              Promota till Admin
            </button>
          )}
        </td>

        {/* Active toggle */}
        <td className="px-4 py-3">
          {emp.role === 'SUPERADMIN' || isSelf ? (
            <span className="text-xs text-text-3">—</span>
          ) : emp.isActive ? (
            <button
              onClick={() => setActiveConfirm(false)}
              className="text-xs font-medium text-danger hover:underline"
            >
              Inaktivera
            </button>
          ) : (
            <button
              onClick={() => setActiveConfirm(true)}
              className="text-xs font-medium text-success hover:underline"
            >
              Aktivera
            </button>
          )}
        </td>
      </tr>

      {roleConfirm !== null && (
        <ConfirmModal
          message={
            roleConfirm === 'ADMIN'
              ? `Promota ${name} till Admin? De får då tillgång till alla adminfunktioner.`
              : `Degradera ${name} till Anställd? De förlorar sina adminrättigheter.`
          }
          onConfirm={confirmRole}
          onClose={() => setRoleConfirm(null)}
          loading={roleMut.isPending}
        />
      )}

      {activeConfirm !== null && (
        <ConfirmModal
          message={
            activeConfirm
              ? `Aktivera ${name}? De kan då logga in igen.`
              : `Inaktivera ${name}? De kan inte längre logga in.`
          }
          onConfirm={confirmActive}
          onClose={() => setActiveConfirm(null)}
          loading={activeMut.isPending}
        />
      )}
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function SuperadminSettingsPage() {
  const { employee, isSuperAdmin } = useAuth()
  const { data: employees, isLoading } = useEmployees()

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />

  const sorted = [...(employees ?? [])].sort((a, b) => {
    const roleOrder: Record<Role, number> = { SUPERADMIN: 0, ADMIN: 1, EMPLOYEE: 2 }
    return roleOrder[a.role] - roleOrder[b.role]
  })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-1">Inställningar</h1>
        <p className="text-sm text-text-3 mt-1">Hantera roller och kontostatus för alla användare.</p>
      </div>

      {/* Role & account management */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-1">Användarhantering</h2>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Anställd</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Roll</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Rollbyte</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Konto</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    emp={emp}
                    currentUserId={employee?.id ?? ''}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
