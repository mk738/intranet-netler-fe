import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useEmployee } from '@/hooks/useEmployees'
import { Avatar } from '@/components/ui/Avatar'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import { EditProfileModal } from '@/components/employees/EditProfileModal'
import { EditBankModal } from '@/components/employees/EditBankModal'
import type { BankInfo, Education, Assignment } from '@/types'

// ── Helpers ───────────────────────────────────────────────────

function maskAccount(account: string): string {
  if (account.length <= 4) return account
  return '•'.repeat(account.length - 4) + account.slice(-4)
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="text-sm text-text-1 mt-0.5">{value ?? <span className="text-text-3">—</span>}</p>
    </div>
  )
}

// ── Sub-sections ──────────────────────────────────────────────

function EducationList({ entries }: { entries: Education[] }) {
  if (!entries.length) return <EmptyState title="No education added yet" />
  return (
    <ul className="space-y-3">
      {entries.map(e => (
        <li key={e.id} className="border-b border-subtle last:border-0 pb-3 last:pb-0">
          <p className="text-sm font-medium text-text-1">{e.institution}</p>
          <p className="text-sm text-text-2">{e.degree} · {e.field}</p>
          <p className="text-xs text-text-3 mt-0.5">
            {e.startYear} – {e.endYear ?? 'present'}
          </p>
        </li>
      ))}
    </ul>
  )
}

function AssignmentList({ items }: { items: Assignment[] }) {
  if (!items.length) return <EmptyState title="No assignments yet" />
  return (
    <ul className="space-y-3">
      {items.map(a => (
        <li key={a.id} className="border-b border-subtle last:border-0 pb-3 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-text-1">{a.projectName}</p>
              <p className="text-xs text-text-3 mt-0.5">
                {format(new Date(a.startDate), 'MMM yyyy')} –{' '}
                {a.endDate ? format(new Date(a.endDate), 'MMM yyyy') : 'present'}
              </p>
            </div>
            <span className={a.status === 'ACTIVE' ? 'badge-active' : 'badge-ended'}>
              {a.status === 'ACTIVE' ? 'Active' : 'Ended'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function BankInfoCard({ bankInfo, onEdit }: { bankInfo: BankInfo | null; onEdit: () => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-text-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <p className="section-label">Bank info</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
      </div>
      {bankInfo ? (
        <div className="space-y-3">
          <InfoRow label="Bank name"       value={bankInfo.bankName} />
          <InfoRow label="Clearing number" value={bankInfo.clearingNumber} />
          <InfoRow label="Account number"  value={maskAccount(bankInfo.accountNumber)} />
        </div>
      ) : (
        <EmptyState title="No bank info added yet" />
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function EmployeeDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const [editProfile, setEditProfile] = useState(false)
  const [editBank,    setEditBank]    = useState(false)

  const { data, isLoading, error } = useEmployee(id ?? '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-danger mb-4">Failed to load employee.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    )
  }

  const p         = data.profile
  const name      = p ? `${p.firstName} ${p.lastName}`.trim() : data.email
  const memberSince = p?.startDate
    ? format(new Date(p.startDate), 'MMMM yyyy')
    : null

  const personalEmpty = !p?.phone && !p?.address && !p?.emergencyContact && !p?.birthDate

  return (
    <>
      <div className="space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate('/admin/employees')}
          className="text-xs text-text-3 hover:text-text-1 transition-colors flex items-center gap-1"
        >
          ← Employees
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <Card>
              <div className="flex flex-col items-center text-center gap-3">
                <Avatar name={name} avatarUrl={p?.avatarUrl ?? null} size="lg" />
                <div>
                  <h2 className="text-base font-semibold text-text-1">{name}</h2>
                  {p?.jobTitle && <p className="text-sm text-text-2 mt-0.5">{p.jobTitle}</p>}
                  <p className="text-xs text-text-3 mt-0.5">{data.email}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <span className={
                    data.role === 'ADMIN'
                      ? 'text-xs px-2 py-0.5 rounded-full font-medium bg-purple-bg text-purple-light border border-purple/20'
                      : 'text-xs px-2 py-0.5 rounded-full font-medium bg-bg-hover text-text-2 border border-subtle'
                  }>
                    {data.role}
                  </span>
                  <span className={data.isActive ? 'badge-active' : 'badge-unplaced'}>
                    {data.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {memberSince && (
                  <p className="text-xs text-text-3">Member since {memberSince}</p>
                )}
              </div>
            </Card>

            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => setEditProfile(true)}
            >
              Edit profile
            </Button>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Personal info */}
            <Card title="Personal info">
              {personalEmpty ? (
                <EmptyState title="No personal info added yet" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Phone"             value={p?.phone ?? null} />
                  <InfoRow label="Birth date"        value={p?.birthDate ? format(new Date(p.birthDate), 'MMM d, yyyy') : null} />
                  <InfoRow label="Address"           value={p?.address ?? null} />
                  <InfoRow label="Emergency contact" value={p?.emergencyContact ?? null} />
                </div>
              )}
            </Card>

            {/* Bank info */}
            <BankInfoCard bankInfo={data.bankInfo} onEdit={() => setEditBank(true)} />

            {/* Education */}
            <Card title="Education">
              <EducationList entries={data.education ?? []} />
            </Card>

            {/* Assignments */}
            <Card title="Assignment history">
              <AssignmentList items={data.assignments ?? []} />
            </Card>
          </div>
        </div>
      </div>

      {editProfile && (
        <EditProfileModal
          employee={data}
          isAdmin={true}
          onClose={() => setEditProfile(false)}
        />
      )}

      {editBank && <EditBankModal onClose={() => setEditBank(false)} employeeId={data.id} />}
    </>
  )
}
