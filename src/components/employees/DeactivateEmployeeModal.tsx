import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { useDeactivateEmployee } from '@/hooks/useEmployees'
import { getApiError } from '@/lib/api'
import { todayString } from '@/lib/dateUtils'
import type { Employee } from '@/types'

interface Props {
  employee: Employee
  isOpen:   boolean
  onClose:  () => void
}

type DeactivationType = 'immediate' | 'scheduled'

export function DeactivateEmployeeModal({ employee, isOpen, onClose }: Props) {
  const [step,        setStep]        = useState<'pick' | 'confirm'>('pick')
  const [type,        setType]        = useState<DeactivationType>('immediate')
  const [date,        setDate]        = useState('')
  const [confirmName, setConfirmName] = useState('')

  const mutation = useDeactivateEmployee(employee.id)

  const fullName = employee.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName}`
    : employee.email

  if (!isOpen) return null

  function handleClose() {
    setStep('pick')
    setType('immediate')
    setDate('')
    setConfirmName('')
    mutation.reset()
    onClose()
  }

  function handleSubmit() {
    mutation.mutate(
      {
        confirmName,
        employmentEndDate: type === 'immediate' ? null : date,
      },
      { onSuccess: handleClose }
    )
  }

  const canProceed = type === 'immediate' || date !== ''
  const nameMatch  = confirmName.trim().toLowerCase() === fullName.trim().toLowerCase()

  return (
    <Modal
      title={step === 'pick' ? 'Inaktivera anställd' : 'Bekräfta inaktivering'}
      onClose={handleClose}
      footer={
        step === 'pick' ? (
          <>
            <Button variant="secondary" onClick={handleClose}>Avbryt</Button>
            <Button variant="danger" onClick={() => setStep('confirm')} disabled={!canProceed}>
              Nästa
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep('pick')}>Tillbaka</Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              disabled={!nameMatch}
              loading={mutation.isPending}
            >
              Inaktivera
            </Button>
          </>
        )
      }
    >
      {step === 'pick' ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setType('immediate')}
            className={[
              'w-full text-left px-4 py-3 rounded-lg border transition-colors',
              type === 'immediate'
                ? 'border-danger/40 bg-danger/5 text-text-1'
                : 'border-subtle bg-bg-hover/40 text-text-2 hover:border-mild hover:text-text-1',
            ].join(' ')}
          >
            <p className="text-sm font-medium">Inaktivera omedelbart</p>
            <p className="text-xs text-text-3 mt-0.5">Kontot stängs av direkt</p>
          </button>

          <button
            type="button"
            onClick={() => setType('scheduled')}
            className={[
              'w-full text-left px-4 py-3 rounded-lg border transition-colors',
              type === 'scheduled'
                ? 'border-purple/40 bg-purple-bg text-text-1'
                : 'border-subtle bg-bg-hover/40 text-text-2 hover:border-mild hover:text-text-1',
            ].join(' ')}
          >
            <p className="text-sm font-medium">Schemalägg datum</p>
            <p className="text-xs text-text-3 mt-0.5">Kontot stängs av ett valt datum</p>
          </button>

          {type === 'scheduled' && (
            <div className="pt-1">
              <label className="field-label">Sista anställningsdag</label>
              <DatePicker
                value={date}
                onChange={setDate}
                min={todayString()}
                placeholder="Välj datum"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-2">
            Skriv{' '}
            <span className="text-text-1 font-medium">{fullName}</span>
            {' '}för att bekräfta.
          </p>
          <input
            type="text"
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={fullName}
            className="field-input w-full"
            autoFocus
          />
          {mutation.isError && (
            <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
              {getApiError(mutation.error)}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
