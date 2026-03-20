import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useEmployees } from '@/hooks/useEmployees'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, Button } from '@/components/ui'
import { InviteEmployeeModal } from '@/components/employees/InviteEmployeeModal'
import { ToastContainer } from '@/components/ui/Toast'
import type { Employee } from '@/types'

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

const rowVariants = {
  hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
  show:   { opacity: 1, y: 0, transition: { duration: prefersReduced ? 0 : 0.15 } },
}
const tbodyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: prefersReduced ? 0 : 0.04 } },
}

// ── Skeleton row ──────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="table-row">
      {[40, 24, 24, 32, 24, 16].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 bg-bg-hover rounded animate-pulse w-${w}`} />
        </td>
      ))}
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────

function fullName(e: Employee) {
  if (!e.profile) return e.email
  return [e.profile.firstName, e.profile.lastName].filter(Boolean).join(' ') || e.email
}

export function EmployeeListPage() {
  const navigate          = useNavigate()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)

  const { data: employees, isLoading } = useEmployees()

  const filtered = (employees ?? []).filter(e => {
    const q = query.toLowerCase()
    return fullName(e).toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
  })

  return (
    <>
      <ToastContainer />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">Anställda</h1>
          <Button onClick={() => setModal(true)}>Bjud in anställd</Button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Sök på namn eller e-post..."
            className="field-input pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : !employees?.length ? (
          <EmptyState
            title="Inga anställda ännu"
            description="Bjud in din första teammedlem för att komma igång."
            action={<Button onClick={() => setModal(true)}>Bjud in anställd</Button>}
          />
        ) : !filtered.length && query ? (
          <EmptyState
            title={`Inga resultat för "${query}"`}
            description="Prova ett annat namn eller en annan e-postadress."
            action={<Button variant="secondary" size="sm" onClick={() => setQuery('')}>Rensa sökning</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-subtle">
                  {['Anställd', 'Roll', 'Status', 'Jobbtitel', 'Startdatum', ''].map(col => (
                    <th key={col} className="section-label px-4 pb-2 text-left font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={tbodyVariants} initial="hidden" animate="show">
                {filtered.map(emp => {
                  const name  = fullName(emp)
                  const title = emp.profile?.jobTitle ?? '—'
                  const start = emp.profile?.startDate
                    ? format(new Date(emp.profile.startDate), 'MMM yyyy')
                    : '—'

                  return (
                    <motion.tr
                      key={emp.id}
                      variants={rowVariants}
                      className="table-row cursor-pointer"
                      onClick={() => navigate(`/admin/employees/${emp.id}`)}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={name}
                            avatarUrl={emp.profile?.avatarUrl ?? null}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-text-1">{name}</p>
                            <p className="text-xs text-text-3">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={emp.role === 'ADMIN' ? 'text-sm text-purple-light' : 'text-sm text-text-3'}>
                          {emp.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={emp.isActive ? 'badge-active' : 'badge-unplaced'}>
                          {emp.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>

                      {/* Job title */}
                      <td className="px-4 py-3 text-sm text-text-2">{title}</td>

                      {/* Start date */}
                      <td className="px-4 py-3 text-sm text-text-3">{start}</td>

                      {/* Action */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/employees/${emp.id}`)}
                        >
                          Visa
                        </Button>
                      </td>
                    </motion.tr>
                  )
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <InviteEmployeeModal onClose={() => setModal(false)} />}
    </>
  )
}
