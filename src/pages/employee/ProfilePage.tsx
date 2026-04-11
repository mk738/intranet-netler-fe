import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  useMe,
  useDeleteEducation,
  useUploadAvatar,
  useContract,
  useUploadContract,
  useCV,
  useUploadCV,
  useBenefits,
  useUpsertBenefits,
} from '@/hooks/useEmployees'
import { useMyVacations } from '@/hooks/useVacations'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui'
import { EditProfileModal } from '@/components/employees/EditProfileModal'
import { EditBankModal } from '@/components/employees/EditBankModal'
import { AddEducationModal } from '@/components/employees/AddEducationModal'
import api from '@/lib/api'
import type { Education, BenefitDto } from '@/types'

// ── Constants ─────────────────────────────────────────────────

const VACATION_DAYS_TOTAL = 25

const BENEFIT_ICONS: Record<string, string> = {
  friskvård: '🏃', telefon: '📱', hörlurar: '🎧',
  försäkring: '🛡️', dator: '💻', pension: '🏦',
}

const EDU_COLORS = [
  'bg-purple', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500',
]

// ── Helpers ───────────────────────────────────────────────────

function calcVacationDaysLeft(vacations: import('@/types').VacationDto[] | undefined): number {
  if (!vacations) return VACATION_DAYS_TOTAL
  const year = new Date().getFullYear()
  const used = vacations
    .filter(v => v.status === 'APPROVED' && new Date(v.startDate).getFullYear() === year)
    .reduce((sum, v) => sum + v.daysCount, 0)
  return Math.max(0, VACATION_DAYS_TOTAL - used)
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

// ── Sub-components ────────────────────────────────────────────

function ProfileField({
  label,
  value,
  masked,
}: {
  label: string
  value: string | null | undefined
  masked?: boolean
}) {
  const [revealed, setRevealed] = useState(false)

  const display = masked && !revealed && value
    ? '••••••-••••'
    : (value ?? null)

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {display
          ? <p className="text-[13px] text-text-1">{display}</p>
          : <p className="text-[13px] text-text-3">—</p>
        }
        {masked && value && (
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            className="text-[11px] text-text-3 hover:text-text-2 transition-colors"
          >
            {revealed ? 'Dölj' : 'Visa'}
          </button>
        )}
      </div>
    </div>
  )
}

// Card with a sectioned header (border-bottom) and body
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

// Thin-border ghost button for card headers
function GhostBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs border border-subtle px-2.5 py-1 rounded-lg hover:bg-bg-hover text-text-2 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {children}
    </button>
  )
}

// ── Education row with inline delete confirm ───────────────────

function EducationRow({ entry, dotColor }: { entry: Education; dotColor: string }) {
  const [confirming, setConfirming] = useState(false)
  const del = useDeleteEducation()

  return (
    <div className="flex items-start gap-3 py-3 border-b border-subtle last:border-0 last:pb-0 first:pt-0">
      <div className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-text-1">{entry.institution}</p>
        <p className="text-[12px] text-text-2 mt-0.5">{entry.degree} · {entry.field}</p>
        <p className="text-[11px] text-text-3 mt-0.5">
          {entry.startYear} – {entry.endYear ?? 'pågående'}
        </p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="text-[11px] text-danger hover:underline"
            onClick={() => del.mutate(entry.id, { onSuccess: () => setConfirming(false) })}
          >
            {del.isPending ? '…' : 'Ta bort'}
          </button>
          <button
            className="text-[11px] text-text-3 hover:text-text-2"
            onClick={() => setConfirming(false)}
          >
            Avbryt
          </button>
        </div>
      ) : (
        <button
          className="text-text-3 hover:text-danger transition-colors text-base leading-none shrink-0 mt-0.5"
          onClick={() => setConfirming(true)}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ── Document row ──────────────────────────────────────────────

function DocumentRow({
  name,
  fileData,
  isLoading,
  isPending,
  isAdmin,
  onUpload,
}: {
  name:      string
  fileData:  { downloadUrl: string } | null | undefined
  isLoading: boolean
  isPending: boolean
  isAdmin:   boolean
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
      {/* PDF icon */}
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
        {hasFile && (
          <GhostBtn onClick={openFile}>Visa</GhostBtn>
        )}
        {isAdmin && (
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
            <GhostBtn
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? '…' : hasFile ? 'Ersätt' : 'Ladda upp'}
            </GhostBtn>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function ProfilePage() {
  const { employee: authEmployee, isAdmin } = useAuth()
  const qc = useQueryClient()

  const { data: me, isLoading } = useMe()
  const { data: myVacations }   = useMyVacations()

  const employee  = me ?? authEmployee
  const bankInfo  = me?.bankInfo  ?? null
  const education = me?.education ?? []
  const daysLeft  = calcVacationDaysLeft(myVacations)

  // Benefits
  const { data: benefits }  = useBenefits(employee?.id ?? '')
  const upsertBenefits      = useUpsertBenefits(employee?.id ?? '')
  const [editingBenefits, setEditingBenefits] = useState(false)
  const [benefitList,     setBenefitList]     = useState<Array<{ name: string; description: string }>>([])

  // Documents
  const { data: contractData, isLoading: contractLoading } = useContract(employee?.id ?? '')
  const { data: cvData,       isLoading: cvLoading }       = useCV(employee?.id ?? '')
  const uploadContract = useUploadContract(employee?.id ?? '')
  const uploadCV       = useUploadCV(employee?.id ?? '')

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarMutation = useUploadAvatar(employee?.id ?? '')

  // Modals
  const [editProfile,  setEditProfile]  = useState(false)
  const [editBank,     setEditBank]     = useState(false)
  const [addEdu,       setAddEdu]       = useState(false)
  const [bankRevealed, setBankRevealed] = useState(false)

  if (isLoading && !employee) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  }
  if (!employee) return null

  const p        = employee.profile
  const fullName = p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : employee.email

  const memberSince = p?.startDate
    ? format(new Date(p.startDate), 'MMMM yyyy', { locale: sv })
    : null

  const roleLabel = employee.role === 'SUPERADMIN' ? 'Superadmin'
                  : employee.role === 'ADMIN'       ? 'Admin'
                  : 'Anställd'

  const roleClass = employee.role === 'SUPERADMIN'
    ? 'bg-amber-900/40 text-amber-300 border border-amber-500/20'
    : employee.role === 'ADMIN'
    ? 'bg-purple-bg text-purple-light border border-purple/20'
    : 'bg-bg-hover text-text-2 border border-subtle'

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    avatarMutation.mutate(file, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', 'me'] }),
    })
    e.target.value = ''
  }

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

  const usedDays = VACATION_DAYS_TOTAL - daysLeft

  return (
    <>
      <div className="max-w-5xl">
        <div className="grid grid-cols-[220px_1fr] gap-6 items-start">

          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside className="self-start bg-bg-card border border-subtle rounded-xl overflow-hidden">

            {/* Avatar + identity */}
            <div className="flex flex-col items-center text-center px-5 pt-5 pb-4 gap-3">
              {/* Avatar with camera hover */}
              <div
                className="relative group cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                title="Byt profilbild"
              >
                <Avatar name={fullName} avatarUrl={p?.avatarUrl ?? null} size="xl" />
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {avatarMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                      />
                    </svg>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Name / title */}
              <div>
                <h1 className="text-sm font-semibold text-text-1 leading-snug">{fullName}</h1>
                {p?.jobTitle && (
                  <p className="text-[12px] text-text-2 mt-0.5">{p.jobTitle}</p>
                )}
              </div>

              {/* Role badge */}
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${roleClass}`}>
                {roleLabel}
              </span>
            </div>

            {/* Metadata */}
            <div className="border-t border-subtle px-5 py-4 space-y-3">
              {memberSince && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3">Anställd sedan</p>
                  <p className="text-[13px] text-text-1 mt-0.5 capitalize">{memberSince}</p>
                </div>
              )}
              {p?.phone && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3">Telefon</p>
                  <p className="text-[13px] text-text-1 mt-0.5">{p.phone}</p>
                </div>
              )}
            </div>

            {/* Vacation box */}
            <div className="border-t border-subtle px-5 py-4">
              <div className="bg-bg border border-subtle rounded-lg p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2">Semester</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-text-1 leading-none">{daysLeft}</span>
                  <span className="text-[11px] text-text-3">/ {VACATION_DAYS_TOTAL} dagar kvar</span>
                </div>
                <div className="w-full bg-bg-hover rounded-full h-1 mt-2.5">
                  <div
                    className="bg-purple-light h-1 rounded-full transition-all"
                    style={{ width: `${(daysLeft / VACATION_DAYS_TOTAL) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-3 mt-1.5">
                  {usedDays} {usedDays === 1 ? 'dag' : 'dagar'} använda i år
                </p>
              </div>
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
                <ProfileField label="E-post"        value={employee.email} />
                <ProfileField label="Telefon"       value={p?.phone} />
                <ProfileField label="Personnummer"  value={p?.birthDate ?? null} masked />
                <ProfileField label="Adress"        value={p?.address} />
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
              action={bankRevealed && bankInfo
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
              ) : bankInfo ? (
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3 mb-1">Bank</p>
                    <p className="text-[13px] text-text-1">{bankInfo.bankName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3 mb-1">Clearingnummer</p>
                    <p className="text-[13px] text-text-1">{bankInfo.clearingNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3 mb-1">Kontonummer</p>
                    <p className="text-[13px] text-text-1">{maskAccount(bankInfo.accountNumber)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-text-3">Inga bankuppgifter tillagda</p>
                  <GhostBtn onClick={() => { setBankRevealed(true); setEditBank(true) }}>
                    Lägg till
                  </GhostBtn>
                </div>
              )}
            </SectionCard>

            {/* Benefits */}
            <SectionCard
              title="Förmåner"
              action={
                isAdmin && !editingBenefits ? (
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
                      >
                        ×
                      </button>
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
                <p className="text-[13px] text-text-3">
                  {isAdmin
                    ? 'Inga förmåner tillagda ännu.'
                    : 'Kontakta din administratör för information om förmåner.'}
                </p>
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

            {/* Education */}
            <SectionCard
              title="Utbildning"
              action={<GhostBtn onClick={() => setAddEdu(true)}>+ Lägg till</GhostBtn>}
            >
              {!education.length ? (
                <p className="text-[13px] text-text-3">Ingen utbildning tillagd ännu.</p>
              ) : (
                <div>
                  {education.map((entry, i) => (
                    <EducationRow
                      key={entry.id}
                      entry={entry}
                      dotColor={EDU_COLORS[i % EDU_COLORS.length]}
                    />
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
                isAdmin={isAdmin}
                onUpload={file => uploadContract.mutate(file)}
              />
              <DocumentRow
                name="CV"
                fileData={cvData}
                isLoading={cvLoading}
                isPending={uploadCV.isPending}
                isAdmin={isAdmin}
                onUpload={file => uploadCV.mutate(file)}
              />
            </SectionCard>

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
