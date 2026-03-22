import { useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Modal, Button } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { useTerminateEmployee } from '@/hooks/useEmployees'
import { getApiError } from '@/lib/api'

interface Props {
  employeeId:   string
  employeeName: string
  onClose:      () => void
}

export function TerminateEmploymentModal({ employeeId, employeeName, onClose }: Props) {
  const [step,            setStep]            = useState<'date' | 'confirm'>('date')
  const [terminationDate, setTerminationDate] = useState('')
  const mutation = useTerminateEmployee(employeeId)

  const today = format(new Date(), 'yyyy-MM-dd')

  function goToConfirm() {
    if (!terminationDate) return
    setStep('confirm')
  }

  function confirm() {
    mutation.mutate(terminationDate, {
      onSuccess: () => onClose(),
    })
  }

  if (step === 'confirm') {
    return (
      <Modal
        title="Bekräfta avslutad anställning"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStep('date')}>Tillbaka</Button>
            <Button variant="danger" onClick={confirm} loading={mutation.isPending}>
              Bekräfta
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-2">
            Vill du verkligen avsluta anställningen?
          </p>
          <div className="bg-danger-bg border border-danger/20 rounded-lg p-4 space-y-1">
            <p className="text-sm font-medium text-text-1">{employeeName}</p>
            <p className="text-xs text-text-3">
              Sista dag:{' '}
              <span className="text-danger font-medium">
                {format(new Date(terminationDate + 'T00:00:00'), 'd MMMM yyyy', { locale: sv })}
              </span>
            </p>
          </div>
          <p className="text-xs text-text-3">
            Anställningen förblir aktiv fram till och med det valda datumet. Kontot inaktiveras automatiskt därefter.
          </p>
          {mutation.isError && (
            <p className="text-xs text-danger">{getApiError(mutation.error)}</p>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Avsluta anställning"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button variant="danger" onClick={goToConfirm} disabled={!terminationDate}>
            Gå vidare
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-2">
          Välj sista anställningsdag för{' '}
          <span className="font-medium text-text-1">{employeeName}</span>.
          Kontot förblir aktivt fram till och med detta datum.
        </p>
        <div>
          <label className="field-label">Sista anställningsdag *</label>
          <DatePicker
            value={terminationDate}
            onChange={setTerminationDate}
            min={today}
          />
        </div>
      </div>
    </Modal>
  )
}
