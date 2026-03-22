import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useClient } from '@/hooks/useClients'
import { usePlacements, useCreateAssignment } from '@/hooks/usePlacements'
import { useEmployees } from '@/hooks/useEmployees'
import { useToast } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import { EditClientModal } from '@/components/crm/EditClientModal'

import type { ClientDto, AssignmentDto } from '@/types'

function StatusBadge({ status }: { status: ClientDto['status'] }) {
  if (status === 'ACTIVE')   return <span className="badge-active">Aktiv</span>
  if (status === 'PROSPECT') return <span className="badge-prospect">Prospect</span>
  return <span className="badge-ended">Inaktiv</span>
}

function AssignmentStatusBadge({ status }: { status: AssignmentDto['status'] }) {
  if (status === 'ACTIVE')      return <span className="badge-active">Aktiv</span>
  if (status === 'ENDING_SOON') return <span className="badge-ending">Avslutas snart</span>
  return <span className="badge-ended">Avslutad</span>
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
  const { showToast } = useToast()
  const [editing,    setEditing]    = useState(false)
  const [addingConsultant, setAddingConsultant] = useState(false)
  const [empId,      setEmpId]      = useState('')
  const [projectName, setProjectName] = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [formError,  setFormError]  = useState<string | null>(null)

  const { data: client, isLoading: clientLoading, error } = useClient(id ?? '')
  const { data: placements, isLoading: placementsLoading }  = usePlacements()
  const { data: employees = [] } = useEmployees()
  const createAssignment = useCreateAssignment()

  function openAdd() {
    setEmpId('')
    setProjectName('')
    setStartDate('')
    setFormError(null)
    setAddingConsultant(true)
  }

  function cancelAdd() {
    setAddingConsultant(false)
    setFormError(null)
  }

  function submitAdd() {
    if (!empId || !projectName.trim() || !startDate) {
      setFormError('Fyll i alla fält.')
      return
    }
    setFormError(null)
    createAssignment.mutate(
      { employeeId: empId, clientId: id, projectName: projectName.trim(), startDate },
      {
        onSuccess: () => {
          showToast('Konsult tillagd', 'success')
          setAddingConsultant(false)
        },
        onError: () => {
          setFormError('Det gick inte att lägga till konsulten. Försök igen.')
        },
      }
    )
  }

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
        <p className="text-sm text-danger mb-4">Det gick inte att läsa in kunden.</p>
        <Button variant="secondary" onClick={() => navigate('/admin/crm')}>Gå tillbaka</Button>
      </div>
    )
  }

  return (
    <>

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
          <Button variant="secondary" onClick={() => setEditing(true)}>Redigera</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Left — client details */}
          <Card>
            <p className="section-label mb-4">Kunduppgifter</p>
            <div className="space-y-4">
              <InfoRow label="Kontaktnamn"  value={client.contactName} />
              <InfoRow label="Kontakt-e-post" value={client.contactEmail} />
              <InfoRow label="Telefon"      value={client.phone} />
              <InfoRow label="Orgnummer"    value={client.orgNumber} />
              <InfoRow label="Status"       value={client.status} />
              <InfoRow label="Tillagd"      value={format(new Date(client.createdAt), 'MMMM yyyy')} />
            </div>
          </Card>

          {/* Right — active consultants */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Aktiva konsulter</p>
              {!addingConsultant && (
                <Button variant="secondary" size="sm" onClick={openAdd}>Lägg till</Button>
              )}
            </div>

            {placementsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : !activeConsultants.length && !addingConsultant ? (
              <EmptyState title="Inga aktiva konsulter" />
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
                          Sedan {format(new Date(a.startDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <AssignmentStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}

            {addingConsultant && (
              <div className="border-t border-subtle mt-4 pt-4 space-y-3">
                <div>
                  <label className="field-label">Konsult</label>
                  <select
                    value={empId}
                    onChange={e => setEmpId(e.target.value)}
                    className="field-input"
                  >
                    <option value="">Välj konsult...</option>
                    {employees
                      .filter(e => e.isActive)
                      .map(e => (
                        <option key={e.id} value={e.id}>
                          {e.profile ? `${e.profile.firstName} ${e.profile.lastName}` : e.email}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Projektnamn</label>
                  <input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="t.ex. Backend-utveckling"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Startdatum</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="field-input"
                  />
                </div>
                {formError && (
                  <p className="text-xs text-danger">{formError}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitAdd} loading={createAssignment.isPending}>
                    Spara
                  </Button>
                  <Button size="sm" variant="secondary" onClick={cancelAdd}>
                    Avbryt
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {editing && <EditClientModal client={client} onClose={() => setEditing(false)} />}
    </>
  )
}
