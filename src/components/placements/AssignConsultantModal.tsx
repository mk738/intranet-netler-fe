import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Modal, Button, Spinner } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { DatePicker } from '@/components/ui/DatePicker'
import { useToast } from '@/components/ui/Toast'
import { useClients } from '@/hooks/useClients'
import { useCreateAssignment } from '@/hooks/usePlacements'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'
import type { UnplacedDto, ClientDto } from '@/types'

// ── Form schema ───────────────────────────────────────────────

const schema = z.object({
  projectName:     z.string().min(1, 'Projektnamn krävs'),
  startDate:       z.string().min(1, 'Startdatum krävs'),
  endDate:         z.string().optional(),
  // new client fields
  companyName:     z.string().optional(),
  orgNumber:       z.string().optional(),
  newClientStatus: z.enum(['ACTIVE', 'PROSPECT']).optional(),
  contactName:     z.string().optional(),
  contactEmail:    z.string().optional(),
}).refine(
  data => !data.endDate || !data.startDate || data.endDate >= data.startDate,
  { message: 'Slutdatum måste vara efter startdatum', path: ['endDate'] },
)

type FormData = z.infer<typeof schema>

type ClientMode = 'search' | 'existing' | 'new'

// ── Status badge helper ───────────────────────────────────────

function ClientStatusBadge({ status }: { status: ClientDto['status'] }) {
  const cls = status === 'ACTIVE' ? 'badge-active' : 'badge-prospect'
  return <span className={cls}>{status === 'ACTIVE' ? 'Aktiv' : 'Prospect'}</span>
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  employee: UnplacedDto
  onClose:  () => void
}

export function AssignConsultantModal({ employee, onClose }: Props) {
  const { showToast }    = useToast()
  const mutation         = useCreateAssignment()
  const { data: clients, isLoading: clientsLoading } = useClients()

  const [clientMode,      setClientMode]      = useState<ClientMode>('search')
  const [selectedClient,  setSelectedClient]  = useState<ClientDto | null>(null)
  const [searchQuery,     setSearchQuery]     = useState('')
  const [showDropdown,    setShowDropdown]    = useState(false)
  const [clientError,     setClientError]     = useState<string | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { startDate: today, newClientStatus: 'ACTIVE' },
  })

  // Filter clients client-side
  const filteredClients = (clients ?? []).filter(c =>
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    c.status !== 'INACTIVE',
  )

  const handleSelectClient = (client: ClientDto) => {
    setSelectedClient(client)
    setClientMode('existing')
    setSearchQuery(client.companyName)
    setShowDropdown(false)
    setClientError(null)
  }

  const handleCreateNew = () => {
    setClientMode('new')
    setShowDropdown(false)
    setClientError(null)
  }

  const handleClearClient = () => {
    setSelectedClient(null)
    setClientMode('search')
    setSearchQuery('')
  }

  const onSubmit = (data: FormData) => {
    // Validate client selection
    if (clientMode === 'search' || (clientMode === 'existing' && !selectedClient)) {
      setClientError('Välj eller skapa en kund')
      return
    }
    if (clientMode === 'new' && !data.companyName?.trim()) {
      setClientError('Företagsnamn krävs för ny kund')
      return
    }

    setClientError(null)

    mutation.mutate(
      clientMode === 'existing'
        ? {
            employeeId:  employee.employeeId,
            clientId:    selectedClient!.id,
            projectName: data.projectName,
            startDate:   data.startDate,
            endDate:     data.endDate || undefined,
          }
        : {
            employeeId: employee.employeeId,
            newClient: {
              companyName:  data.companyName!,
              orgNumber:    data.orgNumber    || null,
              contactName:  data.contactName  || null,
              contactEmail: data.contactEmail || null,
              status:       data.newClientStatus ?? 'ACTIVE',
            },
            projectName: data.projectName,
            startDate:   data.startDate,
            endDate:     data.endDate || undefined,
          },
      {
        onSuccess: () => {
          showToast('Uppdrag skapat', 'success')
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      title="Tilldela konsult"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="assign-form" type="submit" loading={mutation.isPending}>
            Spara uppdrag
          </Button>
        </>
      }
    >
      <form id="assign-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Consultant chip */}
        <div className="flex items-center gap-3 bg-bg-hover border border-mild rounded-lg p-3">
          <Avatar name={employee.fullName} avatarUrl={null} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-1">{employee.fullName}</p>
            {employee.jobTitle && (
              <p className="text-xs text-text-3">{employee.jobTitle}</p>
            )}
            <p className="text-xs text-text-3">
              Ej placerad sedan{' '}
              {employee.lastPlacedDate
                ? format(new Date(employee.lastPlacedDate), 'MMM yyyy')
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Client selector */}
        <div>
          <label className="field-label">Kund</label>

          {/* Search input — hidden once 'new' mode is active and companyName is set */}
          {clientMode !== 'new' && (
            <div className="relative">
              <input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setShowDropdown(true)
                  if (clientMode === 'existing') handleClearClient()
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => {
                  blurTimer.current = setTimeout(() => setShowDropdown(false), 150)
                }}
                placeholder="Sök kunder..."
                className="field-input"
              />

              {/* Dropdown */}
              {showDropdown && searchQuery.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-bg border border-mild rounded-lg overflow-hidden shadow-modal">
                  {clientsLoading ? (
                    <div className="flex justify-center py-3"><Spinner size="sm" /></div>
                  ) : (
                    <>
                      {filteredClients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onMouseDown={() => handleSelectClient(client)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-hover transition-colors text-left"
                        >
                          <span className="text-sm text-text-1">{client.companyName}</span>
                          <ClientStatusBadge status={client.status} />
                        </button>
                      ))}
                      <button
                        type="button"
                        onMouseDown={handleCreateNew}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left border-t border-subtle"
                      >
                        <span className="text-sm text-purple-light font-medium">
                          + Skapa ny kund "{searchQuery}"
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected existing client chip */}
          {clientMode === 'existing' && selectedClient && (
            <div className="flex items-center justify-between bg-bg-hover border border-mild rounded-lg px-3 py-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-1">{selectedClient.companyName}</span>
                <ClientStatusBadge status={selectedClient.status} />
              </div>
              <button
                type="button"
                onClick={handleClearClient}
                className="text-text-3 hover:text-text-1 transition-colors text-base leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* New client inline form */}
          {clientMode === 'new' && (
            <div className="bg-bg-input border border-purple/25 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-label">Ny kund</p>
                <div className="flex items-center gap-2">
                  <span className="badge-prospect">creating</span>
                  <button
                    type="button"
                    onClick={handleClearClient}
                    className="text-text-3 hover:text-text-1 transition-colors text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div>
                <label className="field-label">Företagsnamn *</label>
                <input
                  {...register('companyName')}
                  defaultValue={searchQuery}
                  className="field-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Org-nummer</label>
                  <input {...register('orgNumber')} className="field-input" placeholder="556000-0000" />
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select {...register('newClientStatus')} className="field-input">
                    <option value="ACTIVE">Aktiv</option>
                    <option value="PROSPECT">Prospect</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Kontaktperson</label>
                  <input {...register('contactName')} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Kontakt-e-post</label>
                  <input {...register('contactEmail')} type="email" className="field-input" />
                </div>
              </div>
            </div>
          )}

          <FieldError message={clientError ?? undefined} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-subtle" />
          <p className="section-label">Projektdetaljer</p>
          <div className="flex-1 h-px bg-subtle" />
        </div>

        {/* Project fields */}
        <div>
          <label className="field-label">Projektnamn *</label>
          <input {...register('projectName')} className="field-input" />
          <FieldError message={errors.projectName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Startdatum *</label>
            <DatePicker
              value={watch('startDate') ?? ''}
              onChange={v => setValue('startDate', v, { shouldValidate: true })}
            />
            <FieldError message={errors.startDate?.message} />
          </div>
          <div>
            <label className="field-label">Slutdatum</label>
            <DatePicker
              value={watch('endDate') ?? ''}
              onChange={v => setValue('endDate', v, { shouldValidate: true })}
              min={watch('startDate')}
              placeholder="Inget slutdatum"
            />
            <FieldError message={errors.endDate?.message} />
          </div>
        </div>

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
