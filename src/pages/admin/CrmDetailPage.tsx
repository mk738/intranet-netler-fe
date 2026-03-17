import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useClient } from '@/hooks/useClients'
import { usePlacements } from '@/hooks/usePlacements'
import { Avatar } from '@/components/ui/Avatar'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import { EditClientModal } from '@/components/crm/EditClientModal'
import { ToastContainer } from '@/components/ui/Toast'
import type { ClientDto, AssignmentDto } from '@/types'

function StatusBadge({ status }: { status: ClientDto['status'] }) {
  if (status === 'ACTIVE')   return <span className="badge-active">Active</span>
  if (status === 'PROSPECT') return <span className="badge-prospect">Prospect</span>
  return <span className="badge-ended">Inactive</span>
}

function AssignmentStatusBadge({ status }: { status: AssignmentDto['status'] }) {
  if (status === 'ACTIVE')      return <span className="badge-active">Active</span>
  if (status === 'ENDING_SOON') return <span className="badge-ending">Ending soon</span>
  return <span className="badge-ended">Ended</span>
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="text-sm text-text-1 mt-0.5">{value ?? <span className="text-text-3">—</span>}</p>
    </div>
  )
}

export function CrmDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [editing, setEditing] = useState(false)

  const { data: client, isLoading: clientLoading, error } = useClient(id ?? '')
  const { data: placements, isLoading: placementsLoading }  = usePlacements()

  const activeConsultants = placements?.clientGroups
    .find(g => g.clientId === id)
    ?.assignments
    .filter(a => a.status === 'ACTIVE' || a.status === 'ENDING_SOON')
    ?? []

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-danger mb-4">Failed to load client.</p>
        <Button variant="secondary" onClick={() => navigate('/admin/crm')}>Go back</Button>
      </div>
    )
  }

  return (
    <>
      <ToastContainer />

      <div className="space-y-5 max-w-4xl">
        {/* Back + header */}
        <button
          onClick={() => navigate('/admin/crm')}
          className="text-xs text-text-3 hover:text-text-1 transition-colors flex items-center gap-1"
        >
          ← CRM
        </button>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text-1">{client.companyName}</h1>
            <StatusBadge status={client.status} />
          </div>
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Left — client details */}
          <Card>
            <p className="section-label mb-4">Client details</p>
            <div className="space-y-4">
              <InfoRow label="Contact name"  value={client.contactName} />
              <InfoRow label="Contact email" value={client.contactEmail} />
              <InfoRow label="Phone"         value={client.phone} />
              <InfoRow label="Org number"    value={client.orgNumber} />
              <InfoRow label="Status"        value={client.status} />
              <InfoRow label="Added"         value={format(new Date(client.createdAt), 'MMMM yyyy')} />
            </div>
          </Card>

          {/* Right — active consultants */}
          <Card>
            <p className="section-label mb-4">Active consultants</p>
            {placementsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : !activeConsultants.length ? (
              <EmptyState
                title="No active consultants"
                description="Assign a consultant to this client from the placements page."
                action={<Button variant="secondary" size="sm" onClick={() => navigate('/admin/placements')}>Go to placements</Button>}
              />
            ) : (
              <ul className="space-y-3">
                {activeConsultants.map(a => (
                  <li key={a.id} className="flex items-start justify-between gap-3 border-b border-subtle last:border-0 pb-3 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <Avatar name={a.fullName} avatarUrl={null} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-text-1">{a.fullName}</p>
                        {a.jobTitle && <p className="text-xs text-text-3">{a.jobTitle}</p>}
                        <p className="text-xs text-text-2 mt-0.5">{a.projectName}</p>
                        <p className="text-xs text-text-3">
                          Since {format(new Date(a.startDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <AssignmentStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {editing && <EditClientModal client={client} onClose={() => setEditing(false)} />}
    </>
  )
}
