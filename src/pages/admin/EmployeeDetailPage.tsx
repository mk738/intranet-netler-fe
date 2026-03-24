import { useState, useRef, KeyboardEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useEmployee } from '@/hooks/useEmployees'
import { useEndAssignment } from '@/hooks/usePlacements'
import { useToast } from '@/components/ui/Toast'
import { useSkills, useEmployeeSkills, useSetEmployeeSkills } from '@/hooks/useSkills'
import { AvatarUpload } from '@/components/employees/AvatarUpload'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import { EditProfileModal } from '@/components/employees/EditProfileModal'
import { EditBankModal } from '@/components/employees/EditBankModal'
import { TerminateEmploymentModal } from '@/components/employees/TerminateEmploymentModal'
import { EndAssignmentConfirmModal } from '@/components/placements/EndAssignmentConfirmModal'
import { AssignConsultantModal } from '@/components/placements/AssignConsultantModal'
import { BenefitsCard } from '@/components/employees/BenefitsCard'
import { EmploymentContractCard } from '@/components/employees/EmploymentContractCard'
import { CvCard } from '@/components/employees/CvCard'
import type { BankInfo, Education, Assignment, AssignmentDto, UnplacedDto } from '@/types'

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
  if (!entries.length) return <EmptyState title="Ingen utbildning tillagd ännu" />
  return (
    <ul className="space-y-3">
      {entries.map(e => (
        <li key={e.id} className="border-b border-subtle last:border-0 pb-3 last:pb-0">
          <p className="text-sm font-medium text-text-1">{e.institution}</p>
          <p className="text-sm text-text-2">{e.degree} · {e.field}</p>
          <p className="text-xs text-text-3 mt-0.5">
            {e.startYear} – {e.endYear ?? 'pågående'}
          </p>
        </li>
      ))}
    </ul>
  )
}

function AssignmentList({ items }: { items: Assignment[] }) {
  if (!items.length) return <EmptyState title="Inga uppdrag ännu" />
  return (
    <ul className="space-y-3">
      {items.map(a => (
        <li key={a.id} className="border-b border-subtle last:border-0 pb-3 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-text-1">{a.projectName}</p>
              <p className="text-xs text-text-2 mt-0.5">{a.companyName}</p>
              <p className="text-xs text-text-3 mt-0.5">
                {format(new Date(a.startDate), 'MMM yyyy')} –{' '}
                {a.endDate ? format(new Date(a.endDate), 'MMM yyyy') : 'pågående'}
              </p>
            </div>
            <span className={a.status === 'ACTIVE' ? 'badge-active' : 'badge-ended'}>
              {a.status === 'ACTIVE' ? 'Aktiv' : 'Avslutad'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CurrentAssignmentCard({
  assignment,
  onEnd,
  onEndImmediate,
  onAssign,
  endingPending,
}: {
  assignment:     Assignment | null
  onEnd:          () => void
  onEndImmediate: () => void
  onAssign:       () => void
  endingPending:  boolean
}) {
  const isEnded = assignment?.status === 'ENDED'

  return (
    <Card title="Nuvarande uppdrag">
      {assignment ? (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-text-1">{assignment.projectName}</p>
            <p className="text-xs text-text-2 mt-0.5">{assignment.companyName}</p>
            <p className="text-xs text-text-3 mt-0.5">
              {assignment.startDate > format(new Date(), 'yyyy-MM-dd') ? 'Startar' : 'Startade'}{' '}
              {format(new Date(assignment.startDate + 'T00:00:00'), 'd MMM yyyy', { locale: sv })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={isEnded ? 'badge-ended' : 'badge-active'}>
              {isEnded ? 'Avslutad' : 'Aktiv'}
            </span>
            {isEnded ? (
              <Button
                variant="secondary"
                size="sm"
                loading={endingPending}
                onClick={onEndImmediate}
              >
                Flytta till oplacerade
              </Button>
            ) : (
              <Button variant="danger" size="sm" onClick={onEnd}>Avsluta</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-3">Ingen aktiv placering</p>
          <Button size="sm" onClick={onAssign}>Tilldela uppdrag</Button>
        </div>
      )}
    </Card>
  )
}

function SkillsCard({ employeeId }: { employeeId: string }) {
  const [adding, setAdding] = useState(false)
  const [draft,  setDraft]  = useState<string[]>([])
  const [input,  setInput]  = useState('')
  const [error,  setError]  = useState<string | null>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  const { data: catalog = [] }      = useSkills()
  const { data: empSkills = [] }    = useEmployeeSkills(employeeId)
  const mutation                    = useSetEmployeeSkills(employeeId)

  const currentNames = empSkills.map(s => s.name)

  const suggestions = input.trim()
    ? catalog
        .map(s => s.name)
        .filter(n => n.includes(input.trim().toLowerCase()) && !draft.includes(n))
        .slice(0, 5)
    : []

  function openAdd() {
    setDraft(currentNames)
    setInput('')
    setError(null)
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function cancel() {
    setAdding(false)
    setInput('')
    setDraft([])
  }

  function addToDraft(name?: string) {
    const val = (name ?? input).trim().toLowerCase()
    setInput('')
    if (!val || draft.includes(val)) return
    setDraft(prev => [...prev, val])
    inputRef.current?.focus()
  }

  function removeFromDraft(s: string) {
    setDraft(prev => prev.filter(x => x !== s))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  { e.preventDefault(); addToDraft() }
    if (e.key === 'Escape') { cancel() }
  }

  function save() {
    setError(null)
    const pending = input.trim().toLowerCase()
    const next    = pending && !draft.includes(pending) ? [...draft, pending] : draft
    mutation.mutate(next, {
      onSuccess: () => { setAdding(false); setInput(''); setDraft([]) },
      onError:   () => setError('Kunde inte spara kompetenserna. Försök igen.'),
    })
  }

  const displayed = adding ? draft : currentNames

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Kompetenser</p>
        {!adding && (
          <Button variant="secondary" size="sm" onClick={openAdd}>Lägg till</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {displayed.map(s => (
          <span key={s} className="flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-bg text-purple-light border border-purple/20">
            {s}
            {adding && (
              <button
                onClick={() => removeFromDraft(s)}
                className="hover:text-danger transition-colors leading-none"
              >
                ×
              </button>
            )}
          </span>
        ))}

        {adding && (
          <div className="relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="kompetens + Enter"
              className="px-2.5 py-0.5 rounded-full text-xs bg-bg-hover border border-subtle text-text-1 placeholder:text-text-3 outline-none w-40"
            />
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 mt-1 z-10 bg-bg border border-subtle rounded-lg shadow-modal overflow-hidden min-w-[160px]">
                {suggestions.map(s => (
                  <li key={s}>
                    <button
                      onMouseDown={e => { e.preventDefault(); addToDraft(s) }}
                      className="w-full text-left px-3 py-1.5 text-xs text-text-1 hover:bg-bg-hover transition-colors"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {displayed.length === 0 && !adding && (
          <p className="text-sm text-text-3">Inga kompetenser tillagda ännu</p>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={save} loading={mutation.isPending}>Spara</Button>
          <Button size="sm" variant="secondary" onClick={cancel}>Avbryt</Button>
        </div>
      )}

      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </Card>
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
          <p className="section-label">Bankinformation</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>Redigera</Button>
      </div>
      {bankInfo ? (
        <div className="space-y-3">
          <InfoRow label="Banknamn"       value={bankInfo.bankName} />
          <InfoRow label="Clearingnummer" value={bankInfo.clearingNumber} />
          <InfoRow label="Kontonummer"    value={maskAccount(bankInfo.accountNumber)} />
        </div>
      ) : (
        <EmptyState title="Ingen bankinformation tillagd ännu" />
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function EmployeeDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const [editProfile,    setEditProfile]    = useState(false)
  const [editBank,       setEditBank]       = useState(false)
  const [terminate,      setTerminate]      = useState(false)
  const [endAssignment,  setEndAssignment]  = useState(false)
  const [assignOpen,     setAssignOpen]     = useState(false)

  const { showToast }      = useToast()
  const endMutation        = useEndAssignment()

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
        <p className="text-sm text-danger mb-4">Det gick inte att läsa in den anställde.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Gå tillbaka</Button>
      </div>
    )
  }

  const p         = data.profile
  const name      = p ? `${p.firstName} ${p.lastName}`.trim() : data.email
  const memberSince = p?.startDate
    ? format(new Date(p.startDate), 'MMMM yyyy')
    : null

  const today = format(new Date(), 'yyyy-MM-dd')
  const isEffectivelyActive = data.isActive ||
    (!!data.terminationDate && data.terminationDate >= today)
  const pendingTermination = data.terminationDate && data.terminationDate >= today

  const personalEmpty = !p?.phone && !p?.address && !p?.emergencyContact && !p?.birthDate

  return (
    <>
      <div className="space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate('/admin/employees')}
          className="text-xs text-text-3 hover:text-text-1 transition-colors flex items-center gap-1"
        >
          ← Anställda
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <Card>
              <div className="flex flex-col items-center text-center gap-3">
                <AvatarUpload employeeId={data.id} name={name} avatarUrl={p?.avatarUrl ?? null} />
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
                  <span className={isEffectivelyActive ? 'badge-active' : 'badge-unplaced'}>
                    {isEffectivelyActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                {pendingTermination && (
                  <p className="text-xs text-warning">
                    Avslutas {format(new Date(data.terminationDate! + 'T00:00:00'), 'd MMM yyyy', { locale: sv })}
                  </p>
                )}
                {memberSince && (
                  <p className="text-xs text-text-3">Anställd sedan {memberSince}</p>
                )}
              </div>
            </Card>

            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => setEditProfile(true)}
            >
              Redigera profil
            </Button>

            {isEffectivelyActive && !pendingTermination && (
              <Button
                variant="danger"
                className="w-full justify-center"
                onClick={() => setTerminate(true)}
              >
                Avsluta anställning
              </Button>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Personal info */}
            <Card title="Personlig information">
              {personalEmpty ? (
                <EmptyState title="Ingen personlig information tillagd ännu" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Telefon"      value={p?.phone ?? null} />
                  <InfoRow label="Födelsedatum" value={p?.birthDate ? format(new Date(p.birthDate), 'MMM d, yyyy') : null} />
                  <InfoRow label="Adress"       value={p?.address ?? null} />
                  <InfoRow label="Nödkontakt"   value={p?.emergencyContact ?? null} />
                </div>
              )}
            </Card>

            {/* Bank info */}
            <BankInfoCard bankInfo={data.bankInfo} onEdit={() => setEditBank(true)} />

            {/* Education */}
            <Card title="Utbildning">
              <EducationList entries={data.education ?? []} />
            </Card>

            {/* Current assignment */}
            <CurrentAssignmentCard
              assignment={data.currentAssignment ?? null}
              onEnd={() => setEndAssignment(true)}
              onEndImmediate={() => {
                const a = data.currentAssignment!
                endMutation.mutate(
                  { id: a.id, endDate: a.endDate ?? format(new Date(), 'yyyy-MM-dd') },
                  {
                    onSuccess: () => {
                      showToast('Konsulten är nu oplacerad', 'success')
                    },
                  }
                )
              }}
              onAssign={() => setAssignOpen(true)}
              endingPending={endMutation.isPending}
            />

            {/* Assignments */}
            <Card title="Uppdragshistorik">
              <AssignmentList items={data.assignments ?? []} />
            </Card>

            {/* Skills */}
            <SkillsCard employeeId={data.id} />

            {/* Benefits */}
            <BenefitsCard employeeId={data.id} isAdmin={true} />

            {/* CV */}
            <CvCard employeeId={data.id} isAdmin={true} />

            {/* Employment contract */}
            <EmploymentContractCard employeeId={data.id} isAdmin={true} />
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

      {terminate && (
        <TerminateEmploymentModal
          employeeId={data.id}
          employeeName={name}
          onClose={() => setTerminate(false)}
        />
      )}

      {assignOpen && (() => {
        const initials = (p ? `${p.firstName[0]}${p.lastName[0]}` : name.slice(0, 2)).toUpperCase()
        const unplaced: UnplacedDto = {
          employeeId:       data.id,
          fullName:         name,
          initials,
          jobTitle:         p?.jobTitle ?? null,
          avatarUrl:        p?.avatarUrl ?? null,
          lastPlacedClient: null,
          lastPlacedDate:   null,
        }
        return (
          <AssignConsultantModal
            employee={unplaced}
            onClose={() => setAssignOpen(false)}
          />
        )
      })()}

      {endAssignment && data.currentAssignment && (() => {
        const a = data.currentAssignment
        const initials = (p ? `${p.firstName[0]}${p.lastName[0]}` : name.slice(0, 2)).toUpperCase()
        const dto: AssignmentDto = {
          id:          a.id,
          employeeId:  a.employeeId,
          fullName:    name,
          initials,
          jobTitle:    p?.jobTitle ?? null,
          avatarUrl:   p?.avatarUrl ?? null,
          clientId:    a.clientId,
          companyName: a.companyName,
          projectName: a.projectName,
          startDate:   a.startDate,
          endDate:     a.endDate,
          status:      'ACTIVE',
        }
        return (
          <EndAssignmentConfirmModal
            assignment={dto}
            onClose={() => setEndAssignment(false)}
          />
        )
      })()}
    </>
  )
}
