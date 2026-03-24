import { useState } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useMe, useDeleteEducation } from '@/hooks/useEmployees'
import { useMyVacations } from '@/hooks/useVacations'
import { Avatar } from '@/components/ui/Avatar'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import { EditProfileModal } from '@/components/employees/EditProfileModal'
import { EditBankModal } from '@/components/employees/EditBankModal'
import { AddEducationModal } from '@/components/employees/AddEducationModal'
import { BenefitsCard } from '@/components/employees/BenefitsCard'
import { EmploymentContractCard } from '@/components/employees/EmploymentContractCard'
import { CvCard } from '@/components/employees/CvCard'
import type { Education } from '@/types'

// ── Helpers ───────────────────────────────────────────────────

function maskAccount(account: string): string {
  if (account.length <= 4) return account
  return '•'.repeat(account.length - 4) + account.slice(-4)
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="text-sm text-text-1 mt-0.5">
        {value ?? <span className="text-text-3">—</span>}
      </p>
    </div>
  )
}

// ── Inline delete confirm ─────────────────────────────────────

function EducationEntry({ entry }: { entry: Education }) {
  const [confirming, setConfirming] = useState(false)
  const deleteMutation = useDeleteEducation()

  if (confirming) {
    return (
      <li className="border-b border-subtle last:border-0 pb-3 last:pb-0">
        <p className="text-xs text-text-2 mb-2">Ta bort den här utbildningsposten?</p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(entry.id, { onSuccess: () => setConfirming(false) })}
          >
            Ta bort
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            Avbryt
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="border-b border-subtle last:border-0 pb-3 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-text-1">{entry.institution}</p>
          <p className="text-sm text-text-2">{entry.degree} · {entry.field}</p>
          <p className="text-xs text-text-3 mt-0.5">
            {entry.startYear} – {entry.endYear ?? 'pågående'}
          </p>
        </div>
        <button
          onClick={() => setConfirming(true)}
          className="text-text-3 hover:text-danger transition-colors text-base leading-none flex-shrink-0 mt-0.5"
          aria-label="Remove education"
        >
          ×
        </button>
      </div>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────

const VACATION_DAYS_TOTAL = 25

function calcVacationDaysLeft(vacations: import('@/types').VacationDto[] | undefined): number {
  if (!vacations) return VACATION_DAYS_TOTAL
  const year = new Date().getFullYear()
  const used = vacations
    .filter(v => v.status === 'APPROVED' && new Date(v.startDate).getFullYear() === year)
    .reduce((sum, v) => sum + v.daysCount, 0)
  return Math.max(0, VACATION_DAYS_TOTAL - used)
}

export function ProfilePage() {
  const { employee: authEmployee, isAdmin } = useAuth()
  const { data: me, isLoading }             = useMe()
  const { data: myVacations }               = useMyVacations()

  const [editProfile, setEditProfile] = useState(false)
  const [editBank,    setEditBank]    = useState(false)
  const [addEdu,      setAddEdu]      = useState(false)

  // Use fresh data from useMe once available, fall back to AuthContext on first render
  const employee   = me ?? authEmployee
  const bankInfo   = me?.bankInfo   ?? null
  const education  = me?.education  ?? []
  const daysLeft   = calcVacationDaysLeft(myVacations)

  if (isLoading && !employee) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  }
  if (!employee) return null

  const p             = employee.profile
  const fullName      = p
    ? [p.firstName, p.lastName].filter(Boolean).join(' ')
    : employee.email
  const memberSince   = p?.startDate
    ? format(new Date(p.startDate), 'MMMM yyyy')
    : null
  const personalEmpty = !p?.phone && !p?.address && !p?.emergencyContact && !p?.birthDate

  return (
    <>
      <div className="max-w-3xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Left column — identity */}
          <Card>
            <div className="flex flex-col items-center text-center gap-3">
              <Avatar name={fullName} avatarUrl={p?.avatarUrl ?? null} size="lg" />
              <div>
                <h1 className="text-base font-semibold text-text-1">{fullName}</h1>
                {p?.jobTitle && <p className="text-sm text-text-2 mt-0.5">{p.jobTitle}</p>}
                <p className="text-xs text-text-3 mt-0.5">{employee.email}</p>
              </div>
              <span className={
                isAdmin
                  ? 'text-xs px-2 py-0.5 rounded-full font-medium bg-purple-bg text-purple-light border border-purple/20'
                  : 'text-xs px-2 py-0.5 rounded-full font-medium bg-bg-hover text-text-2 border border-subtle'
              }>
                {employee.role}
              </span>
              {memberSince && (
                <p className="text-xs text-text-3">Anställd sedan {memberSince}</p>
              )}

              {/* Vacation days */}
              <div className="w-full border-t border-subtle pt-3 mt-1">
                <p className="text-xs text-text-3 mb-1">Semester dagar kvar</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-2xl font-bold text-text-1 leading-none">{daysLeft}</span>
                  <span className="text-xs text-text-3 mb-0.5">/ {VACATION_DAYS_TOTAL} dagar</span>
                </div>
                <div className="w-full bg-bg-hover rounded-full h-1.5 mt-2">
                  <div
                    className="bg-purple-light h-1.5 rounded-full transition-all"
                    style={{ width: `${(daysLeft / VACATION_DAYS_TOTAL) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Right column — cards */}
          <div className="space-y-5">
            {/* Personal info */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Personlig information</p>
                <Button variant="secondary" size="sm" onClick={() => setEditProfile(true)}>
                  Redigera
                </Button>
              </div>
              {personalEmpty ? (
                <EmptyState title="Ingen personlig information tillagd ännu" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Telefon"    value={p?.phone} />
                  <InfoRow label="Födelsedatum" value={p?.birthDate ? format(new Date(p.birthDate), 'MMM d, yyyy') : null} />
                  <InfoRow label="Adress"     value={p?.address} />
                  <InfoRow label="Nödkontakt" value={p?.emergencyContact} />
                </div>
              )}
            </Card>

            {/* Bank info — compact */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-text-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <p className="section-label">Bankinformation</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditBank(true)}>
                  Redigera
                </Button>
              </div>
              {bankInfo ? (
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <span className="text-xs text-text-3">Bank · </span>
                    <span className="text-xs text-text-1">{bankInfo.bankName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-3">Clearing · </span>
                    <span className="text-xs text-text-1">{bankInfo.clearingNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-3">Konto · </span>
                    <span className="text-xs text-text-1">{maskAccount(bankInfo.accountNumber)}</span>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Ingen bankinformation tillagd"
                  description="Lägg till dina bankuppgifter för löneutbetalning."
                  action={<Button variant="secondary" size="sm" onClick={() => setEditBank(true)}>Lägg till bankinformation</Button>}
                />
              )}
            </Card>

            {/* Education */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Utbildning</p>
                <Button size="sm" onClick={() => setAddEdu(true)}>Lägg till utbildning</Button>
              </div>
              {!education.length ? (
                <EmptyState
                  title="Ingen utbildning tillagd"
                  description="Lägg till dina kvalifikationer i din profil."
                  action={<Button size="sm" onClick={() => setAddEdu(true)}>Lägg till utbildning</Button>}
                />
              ) : (
                <ul className="space-y-3">
                  {education.map(entry => (
                    <EducationEntry key={entry.id} entry={entry} />
                  ))}
                </ul>
              )}
            </Card>

            {/* Benefits */}
            <BenefitsCard employeeId={employee.id} isAdmin={isAdmin} />

            {/* CV */}
            <CvCard employeeId={employee.id} isAdmin={isAdmin} />

            {/* Employment contract */}
            <EmploymentContractCard employeeId={employee.id} isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      {editProfile && (
        <EditProfileModal employee={employee} isAdmin={false} onClose={() => setEditProfile(false)} />
      )}
      {editBank && <EditBankModal onClose={() => setEditBank(false)} employeeId={employee.id} />}
      {addEdu   && <AddEducationModal onClose={() => setAddEdu(false)} />}
    </>
  )
}
