import { useState, useRef, KeyboardEvent } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  useEmployee,
  useContract,
  useUploadContract,
  useCV,
  useUploadCV,
  useBenefits,
  useUpsertBenefits,
} from '@/hooks/useEmployees'
import { useEndAssignment } from '@/hooks/usePlacements'
import { useToast } from '@/components/ui/Toast'
import { useSkills, useEmployeeSkills, useSetEmployeeSkills } from '@/hooks/useSkills'
import { AvatarUpload } from '@/components/employees/AvatarUpload'
import { Spinner, Button } from '@/components/ui'
import { EditProfileModal } from '@/components/employees/EditProfileModal'
import { EditBankModal } from '@/components/employees/EditBankModal'
import { EndAssignmentConfirmModal } from '@/components/placements/EndAssignmentConfirmModal'
import { AssignConsultantModal } from '@/components/placements/AssignConsultantModal'
import { OnboardingChecklist } from '@/components/employees/OnboardingChecklist'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'
import type { BenefitDto, Assignment, AssignmentDto, UnplacedDto } from '@/types'

// ── Shared design primitives ──────────────────────────────────

function SectionCard({
  title,
  action,
  children,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-bg-card border border-subtle rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-text-1 flex items-center gap-2">{title}</div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function GhostBtn({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'text-xs border px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap',
        variant === 'danger'
          ? 'border-danger/40 text-danger hover:bg-danger-bg'
          : 'border-subtle text-text-2 hover:bg-bg-hover',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3 mb-1">{label}</p>
      {value
        ? <p className="text-[13px] text-text-1">{value}</p>
        : <p className="text-[13px] text-text-3">—</p>
      }
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────

const EDU_COLORS = [
  'bg-purple', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500',
]

const BENEFIT_ICONS: Record<string, string> = {
  friskvård: '🏃', telefon: '📱', hörlurar: '🎧',
  försäkring: '🛡️', dator: '💻', pension: '🏦',
}

function benefitIcon(name: string): string {
  const key = name.toLowerCase()
  for (const [k, v] of Object.entries(BENEFIT_ICONS)) {
    if (key.includes(k)) return v
  }
  return '✦'
}

function maskAccount(s: string): string {
  if (s.length <= 4) return s
  return '•'.repeat(s.length - 4) + s.slice(-4)
}

// ── Document row ──────────────────────────────────────────────

function DocumentRow({
  name,
  fileData,
  isLoading,
  isPending,
  onUpload,
}: {
  name:      string
  fileData:  { downloadUrl: string } | null | undefined
  isLoading: boolean
  isPending: boolean
  onUpload:  (file: File) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasFile = !isLoading && !!fileData?.downloadUrl

  const openFile = async () => {
    if (!fileData?.downloadUrl) return
    const url = fileData.downloadUrl
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      const resp = await api.get<Blob>(url, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(resp.data)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-subtle last:border-0 last:pb-0 first:pt-0">
      <div className="w-8 h-8 rounded-lg bg-danger-bg border border-danger/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-danger" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h6v1.5H8V16zm0-6h3v1.5H8V10z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-text-1">{name}</p>
        <p className="text-[11px] text-text-3">
          {isLoading ? 'Laddar…' : hasFile ? 'PDF-fil' : 'Inte uppladdad'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasFile && <GhostBtn onClick={openFile}>Visa</GhostBtn>}
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) { onUpload(f); e.target.value = '' }
            }}
          />
          <GhostBtn onClick={() => fileInputRef.current?.click()} disabled={isPending}>
            {isPending ? '…' : hasFile ? 'Ersätt' : 'Ladda upp'}
          </GhostBtn>
        </>
      </div>
    </div>
  )
}

// ── Skills card ───────────────────────────────────────────────

function SkillsSection({ employeeId }: { employeeId: string }) {
  const [adding, setAdding] = useState(false)
  const [draft,  setDraft]  = useState<string[]>([])
  const [input,  setInput]  = useState('')
  const [error,  setError]  = useState<string | null>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  const { data: catalog = [] }   = useSkills()
  const { data: empSkills = [] } = useEmployeeSkills(employeeId)
  const mutation                 = useSetEmployeeSkills(employeeId)

  const currentNames = empSkills.map(s => s.name)

  const suggestions = input.trim()
    ? catalog
        .map(s => s.name)
        .filter(n => n.includes(input.trim().toLowerCase()) && !draft.includes(n))
        .slice(0, 5)
    : []

  function openAdd() {
    setDraft(currentNames); setInput(''); setError(null); setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function cancel() { setAdding(false); setInput(''); setDraft([]) }

  function addToDraft(name?: string) {
    const val = (name ?? input).trim().toLowerCase()
    setInput('')
    if (!val || draft.includes(val)) return
    setDraft(prev => [...prev, val])
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  { e.preventDefault(); addToDraft() }
    if (e.key === 'Escape') { cancel() }
  }

  function save() {
    setError(null)
    const pending = input.trim().toLowerCase()
    const next = pending && !draft.includes(pending) ? [...draft, pending] : draft
    mutation.mutate(next, {
      onSuccess: () => { setAdding(false); setInput(''); setDraft([]) },
      onError:   () => setError('Kunde inte spara kompetenserna. Försök igen.'),
    })
  }

  const displayed = adding ? draft : currentNames

  return (
    <SectionCard
      title="Kompetenser"
      action={!adding ? <GhostBtn onClick={openAdd}>Lägg till</GhostBtn> : undefined}
    >
      <div className="flex flex-wrap gap-1.5">
        {displayed.map(s => (
          <span key={s} className="flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-bg text-purple-light border border-purple/20">
            {s}
            {adding && (
              <button onClick={() => setDraft(prev => prev.filter(x => x !== s))} className="hover:text-danger transition-colors leading-none">
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
          <p className="text-[13px] text-text-3">Inga kompetenser tillagda ännu</p>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={save}
            disabled={mutation.isPending}
            className="text-xs bg-purple text-white px-3 py-1.5 rounded-lg hover:bg-purple/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Sparar…' : 'Spara'}
          </button>
          <GhostBtn onClick={cancel}>Avbryt</GhostBtn>
        </div>
      )}
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </SectionCard>
  )
}

// ── Assignment card ───────────────────────────────────────────

function CurrentAssignmentSection({
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
    <SectionCard
      title="Nuvarande uppdrag"
      action={!assignment ? <GhostBtn onClick={onAssign}>Tilldela uppdrag</GhostBtn> : undefined}
    >
      {assignment ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-text-1">{assignment.projectName}</p>
            <p className="text-[12px] text-text-2 mt-0.5">{assignment.companyName}</p>
            <p className="text-[11px] text-text-3 mt-0.5">
              {assignment.startDate > format(new Date(), 'yyyy-MM-dd') ? 'Startar' : 'Startade'}{' '}
              {format(new Date(assignment.startDate + 'T00:00:00'), 'd MMM yyyy', { locale: sv })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={isEnded ? 'badge-ended' : 'badge-active'}>
              {isEnded ? 'Avslutad' : 'Aktiv'}
            </span>
            {isEnded
              ? <GhostBtn onClick={onEndImmediate} disabled={endingPending}>Flytta till oplacerade</GhostBtn>
              : <GhostBtn variant="danger" onClick={onEnd}>Avsluta</GhostBtn>
            }
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-text-3">Ingen aktiv placering</p>
      )}
    </SectionCard>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function EmployeeDetailPage() {
  useAuth()
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { state }    = useLocation()
  const backLabel: string = state?.backLabel ?? 'Anställda'
  const backPath:  string = state?.backPath  ?? '/admin/employees'

  const [editProfile,   setEditProfile]   = useState(false)
  const [editBank,      setEditBank]      = useState(false)
  const [endAssignment, setEndAssignment] = useState(false)
  const [assignOpen,    setAssignOpen]    = useState(false)
  const [bankRevealed,  setBankRevealed]  = useState(false)

  const { showToast } = useToast()
  const endMutation   = useEndAssignment()

  // Benefits
  const { data: benefits }  = useBenefits(id ?? '')
  const upsertBenefits      = useUpsertBenefits(id ?? '')
  const [editingBenefits, setEditingBenefits] = useState(false)
  const [benefitList,     setBenefitList]     = useState<Array<{ name: string; description: string }>>([])

  // Documents
  const { data: contractData, isLoading: contractLoading } = useContract(id ?? '')
  const { data: cvData,       isLoading: cvLoading }       = useCV(id ?? '')
  const uploadContract = useUploadContract(id ?? '')
  const uploadCV       = useUploadCV(id ?? '')

  const { data, isLoading, error } = useEmployee(id ?? '')

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>
  }

  if (error || !data) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-danger mb-4">Det gick inte att läsa in den anställde.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Gå tillbaka</Button>
      </div>
    )
  }

  const p    = data.profile
  const name = p ? `${p.firstName} ${p.lastName}`.trim() : data.email

  const today = format(new Date(), 'yyyy-MM-dd')
  const isEffectivelyActive = data.isActive || (!!data.terminationDate && data.terminationDate >= today)
  const pendingTermination  = data.terminationDate && data.terminationDate >= today

  const roleLabel = data.role === 'SUPERADMIN' ? 'Superadmin'
                  : data.role === 'ADMIN'       ? 'Admin'
                  : 'Anställd'

  const roleClass = data.role === 'SUPERADMIN'
    ? 'bg-amber-900/40 text-amber-300 border border-amber-500/20'
    : data.role === 'ADMIN'
    ? 'bg-purple-bg text-purple-light border border-purple/20'
    : 'bg-bg-hover text-text-2 border border-subtle'

  const startEditBenefits = () => {
    setBenefitList((benefits ?? []).map(b => ({ name: b.name, description: b.description ?? '' })))
    setEditingBenefits(true)
  }

  const saveBenefits = () => {
    upsertBenefits.mutate(
      benefitList
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), description: r.description.trim() || null })),
      { onSuccess: () => setEditingBenefits(false) }
    )
  }

  return (
    <>
      <div className="max-w-5xl space-y-4">

        {/* Back */}
        <button
          onClick={() => navigate(backPath)}
          className="text-xs text-text-3 hover:text-text-1 transition-colors flex items-center gap-1"
        >
          ← {backLabel}
        </button>

        <div className="grid grid-cols-[260px_1fr] gap-6 items-start">

          {/* ── Sidebar ─────────────────────────────────────── */}
          <aside className="self-start bg-bg-card border border-subtle rounded-xl overflow-hidden">

            {/* Avatar + identity */}
            <div className="flex flex-col items-center text-center px-5 pt-5 pb-4 gap-3">
              <AvatarUpload employeeId={data.id} name={name} avatarUrl={p?.avatarUrl ?? null} />

              <div>
                <h2 className="text-sm font-semibold text-text-1 leading-snug">{name}</h2>
                {p?.jobTitle && <p className="text-[12px] text-text-2 mt-0.5">{p.jobTitle}</p>}
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${roleClass}`}>
                  {roleLabel}
                </span>
                <span className={isEffectivelyActive ? 'badge-active' : 'badge-unplaced'}>
                  {isEffectivelyActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>

              {pendingTermination && (
                <p className="text-[11px] text-warning">
                  Avslutas {format(new Date(data.terminationDate! + 'T00:00:00'), 'd MMM yyyy', { locale: sv })}
                </p>
              )}
            </div>

            {/* Onboarding */}
            <div className="border-t border-subtle px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-3">Onboarding</p>
              <OnboardingChecklist employeeId={data.id} />
            </div>
          </aside>

          {/* ── Main content ──────────────────────────────────── */}
          <div className="space-y-4">

            {/* Personal information */}
            <SectionCard
              title="Personlig information"
              action={<GhostBtn onClick={() => setEditProfile(true)}>Redigera</GhostBtn>}
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <ProfileField label="Förnamn"       value={p?.firstName} />
                <ProfileField label="Efternamn"     value={p?.lastName} />
                <ProfileField label="E-post"        value={data.email} />
                <ProfileField label="Telefon"       value={p?.phone} />
                <ProfileField label="Adress"        value={p?.address} />
                <ProfileField label="Nödkontakt"    value={p?.emergencyContact} />
                <ProfileField
                  label="Startdatum"
                  value={p?.startDate ? format(new Date(p.startDate), 'd MMM yyyy', { locale: sv }) : null}
                />
                <ProfileField
                  label="Födelsedatum"
                  value={p?.birthDate ? format(new Date(p.birthDate), 'd MMM yyyy', { locale: sv }) : null}
                />
              </div>
            </SectionCard>

            {/* Bank info */}
            <SectionCard
              title={
                <>
                  <svg className="w-3.5 h-3.5 text-text-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Bankuppgifter
                </>
              }
              action={bankRevealed && data.bankInfo
                ? <GhostBtn onClick={() => setEditBank(true)}>Redigera</GhostBtn>
                : undefined
              }
            >
              {!bankRevealed ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-text-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-1">Kräver verifiering</p>
                    <p className="text-[11px] text-text-3 mt-0.5">Visas efter identitetsverifiering</p>
                  </div>
                  <button
                    onClick={() => setBankRevealed(true)}
                    className="text-xs border border-subtle px-2.5 py-1 rounded-lg hover:bg-bg-hover text-text-2 transition-colors shrink-0"
                  >
                    Visa
                  </button>
                </div>
              ) : data.bankInfo ? (
                <div className="grid grid-cols-3 gap-6">
                  <ProfileField label="Bank"           value={data.bankInfo.bankName} />
                  <ProfileField label="Clearingnummer" value={data.bankInfo.clearingNumber} />
                  <ProfileField label="Kontonummer"    value={maskAccount(data.bankInfo.accountNumber)} />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-text-3">Inga bankuppgifter tillagda</p>
                  <GhostBtn onClick={() => { setBankRevealed(true); setEditBank(true) }}>Lägg till</GhostBtn>
                </div>
              )}
            </SectionCard>

            {/* Education — read-only for admin */}
            <SectionCard title="Utbildning">
              {!(data.education?.length) ? (
                <p className="text-[13px] text-text-3">Ingen utbildning tillagd ännu.</p>
              ) : (
                <div>
                  {data.education.map((e, i) => (
                    <div key={e.id} className="flex items-start gap-3 py-3 border-b border-subtle last:border-0 last:pb-0 first:pt-0">
                      <div className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${EDU_COLORS[i % EDU_COLORS.length]}`} />
                      <div>
                        <p className="text-[13px] font-medium text-text-1">{e.institution}</p>
                        <p className="text-[12px] text-text-2 mt-0.5">{e.degree} · {e.field}</p>
                        <p className="text-[11px] text-text-3 mt-0.5">
                          {e.startYear} – {e.endYear ?? 'pågående'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Current assignment */}
            <CurrentAssignmentSection
              assignment={data.currentAssignment ?? null}
              onEnd={() => setEndAssignment(true)}
              onEndImmediate={() => {
                const a = data.currentAssignment!
                endMutation.mutate(
                  { id: a.id, endDate: a.endDate ?? format(new Date(), 'yyyy-MM-dd') },
                  { onSuccess: () => showToast('Konsulten är nu oplacerad', 'success') }
                )
              }}
              onAssign={() => setAssignOpen(true)}
              endingPending={endMutation.isPending}
            />

            {/* Assignment history */}
            <SectionCard title="Uppdragshistorik">
              {!(data.assignments?.length) ? (
                <p className="text-[13px] text-text-3">Inga uppdrag ännu.</p>
              ) : (
                <div>
                  {data.assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-3 border-b border-subtle last:border-0 last:pb-0 first:pt-0">
                      <div>
                        <p className="text-[13px] font-medium text-text-1">{a.projectName}</p>
                        <p className="text-[12px] text-text-2 mt-0.5">{a.companyName}</p>
                        <p className="text-[11px] text-text-3 mt-0.5">
                          {format(new Date(a.startDate), 'MMM yyyy')} –{' '}
                          {a.endDate ? format(new Date(a.endDate), 'MMM yyyy') : 'pågående'}
                        </p>
                      </div>
                      <span className={a.status === 'ACTIVE' ? 'badge-active' : 'badge-ended'}>
                        {a.status === 'ACTIVE' ? 'Aktiv' : 'Avslutad'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Skills */}
            <SkillsSection employeeId={data.id} />

            {/* Benefits */}
            <SectionCard
              title="Förmåner"
              action={
                !editingBenefits ? (
                  <GhostBtn onClick={startEditBenefits}>
                    {(benefits?.length ?? 0) > 0 ? 'Redigera' : 'Lägg till'}
                  </GhostBtn>
                ) : undefined
              }
            >
              {editingBenefits ? (
                <div className="space-y-2">
                  {benefitList.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="field-input flex-1 text-xs py-1.5"
                        placeholder="Förmån (t.ex. Friskvårdsbidrag)"
                        value={row.name}
                        onChange={e => setBenefitList(l =>
                          l.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r)
                        )}
                      />
                      <input
                        className="field-input flex-1 text-xs py-1.5"
                        placeholder="Värde (t.ex. 5 000 kr / år)"
                        value={row.description}
                        onChange={e => setBenefitList(l =>
                          l.map((r, idx) => idx === i ? { ...r, description: e.target.value } : r)
                        )}
                      />
                      <button
                        onClick={() => setBenefitList(l => l.filter((_, idx) => idx !== i))}
                        className="text-text-3 hover:text-danger transition-colors text-base leading-none"
                      >×</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setBenefitList(l => [...l, { name: '', description: '' }])}
                    className="text-xs text-purple-light hover:underline"
                  >
                    + Lägg till förmån
                  </button>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveBenefits}
                      disabled={upsertBenefits.isPending}
                      className="text-xs bg-purple text-white px-3 py-1.5 rounded-lg hover:bg-purple/90 transition-colors disabled:opacity-50"
                    >
                      {upsertBenefits.isPending ? 'Sparar…' : 'Spara'}
                    </button>
                    <GhostBtn onClick={() => setEditingBenefits(false)}>Avbryt</GhostBtn>
                  </div>
                </div>
              ) : !benefits?.length ? (
                <p className="text-[13px] text-text-3">Inga förmåner tillagda ännu.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(benefits as BenefitDto[]).map(b => (
                    <div key={b.id} className="bg-bg border border-subtle rounded-lg px-3 py-2.5 flex items-center gap-2">
                      <span className="text-base leading-none shrink-0">{benefitIcon(b.name)}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-text-1 truncate">{b.name}</p>
                        {b.description && (
                          <p className="text-[10px] text-text-3 truncate">{b.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Documents */}
            <SectionCard title="Dokument">
              <DocumentRow
                name="Anställningsavtal"
                fileData={contractData}
                isLoading={contractLoading}
                isPending={uploadContract.isPending}
                onUpload={file => uploadContract.mutate(file)}
              />
              <DocumentRow
                name="CV"
                fileData={cvData}
                isLoading={cvLoading}
                isPending={uploadCV.isPending}
                onUpload={file => uploadCV.mutate(file)}
              />
            </SectionCard>

          </div>
        </div>
      </div>

      {editProfile && (
        <EditProfileModal employee={data} isAdmin={true} onClose={() => setEditProfile(false)} />
      )}

      {editBank && <EditBankModal onClose={() => setEditBank(false)} employeeId={data.id} />}

      {assignOpen && (() => {
        const initials = (p ? `${p.firstName[0]}${p.lastName[0]}` : name.slice(0, 2)).toUpperCase()
        const unplaced: UnplacedDto = {
          employeeId: data.id, fullName: name, initials,
          jobTitle: p?.jobTitle ?? null, avatarUrl: p?.avatarUrl ?? null,
          lastPlacedClient: null, lastPlacedDate: null,
        }
        return <AssignConsultantModal employee={unplaced} onClose={() => setAssignOpen(false)} />
      })()}

      {endAssignment && data.currentAssignment && (() => {
        const a = data.currentAssignment
        const initials = (p ? `${p.firstName[0]}${p.lastName[0]}` : name.slice(0, 2)).toUpperCase()
        const dto: AssignmentDto = {
          id: a.id, employeeId: a.employeeId, fullName: name, initials,
          jobTitle: p?.jobTitle ?? null, avatarUrl: p?.avatarUrl ?? null,
          clientId: a.clientId, companyName: a.companyName, projectName: a.projectName,
          startDate: a.startDate, endDate: a.endDate, status: 'ACTIVE',
        }
        return <EndAssignmentConfirmModal assignment={dto} onClose={() => setEndAssignment(false)} />
      })()}
    </>
  )
}
