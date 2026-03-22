import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useClients } from '@/hooks/useClients'
import { EmptyState, Button } from '@/components/ui'

import { AddClientModal } from '@/components/crm/AddClientModal'
import { EditClientModal } from '@/components/crm/EditClientModal'
import type { ClientDto } from '@/types'

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

function StatusBadge({ status }: { status: ClientDto['status'] }) {
  if (status === 'ACTIVE')   return <span className="badge-active">Aktiv</span>
  if (status === 'PROSPECT') return <span className="badge-prospect">Prospect</span>
  return <span className="badge-ended">Inaktiv</span>
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-2xl font-semibold text-text-1 leading-none">{value}</p>
      <p className="text-xs text-text-3 mt-1">{label}</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-subtle">
      {[32, 24, 28, 16, 20, 16].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-bg-hover animate-pulse" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

export function CrmListPage() {
  const navigate           = useNavigate()
  const [query, setQuery]  = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClientDto | null>(null)

  const { data: clients, isLoading } = useClients()

  const filtered = (clients ?? []).filter(c =>
    c.companyName.toLowerCase().includes(query.toLowerCase()),
  )

  const activeCount   = (clients ?? []).filter(c => c.status === 'ACTIVE').length
  const prospectCount = (clients ?? []).filter(c => c.status === 'PROSPECT').length

  return (
    <>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">CRM</h1>
          <Button onClick={() => setAddOpen(true)}>Lägg till kund</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Aktiva kunder" value={activeCount} />
          <StatCard label="Prospects"     value={prospectCount} />
          <StatCard label="Totalt"        value={clients?.length ?? 0} />
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
            placeholder="Sök på företagsnamn..."
            className="field-input pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : !clients?.length ? (
          <EmptyState
            title="Inga kunder ännu"
            description="Lägg till din första kund för att börja spåra placeringar."
            action={<Button onClick={() => setAddOpen(true)}>Lägg till kund</Button>}
          />
        ) : !filtered.length && query ? (
          <EmptyState
            title={`Inga resultat för "${query}"`}
            description="Prova ett annat företagsnamn."
            action={<Button variant="secondary" size="sm" onClick={() => setQuery('')}>Rensa sökning</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-subtle">
                  {['Företag', 'Kontakt', 'E-post', 'Status', 'Orgnummer', ''].map(col => (
                    <th key={col} className="section-label px-4 pb-2 text-left font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={tbodyVariants} initial="hidden" animate="show">
                {filtered.map(client => (
                  <motion.tr
                    key={client.id}
                    variants={rowVariants}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/admin/crm/${client.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text-1">{client.companyName}</td>
                    <td className="px-4 py-3 text-sm text-text-2">{client.contactName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-2">{client.contactEmail ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                    <td className="px-4 py-3 text-sm text-text-3">{client.orgNumber ?? '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditTarget(client)}
                        >
                          Redigera
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/admin/crm/${client.id}`)}
                        >
                          Visa
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {addOpen    && <AddClientModal onClose={() => setAddOpen(false)} />}
      {editTarget && <EditClientModal client={editTarget} onClose={() => setEditTarget(null)} />}
    </>
  )
}
