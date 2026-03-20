import { Modal, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useCancelVacation } from '@/hooks/useVacations'
import { formatDateRange } from '@/lib/dateUtils'
import type { VacationDto } from '@/types'

interface Props {
  vacation: VacationDto
  onClose:  () => void
}

export function CancelVacationConfirmModal({ vacation, onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useCancelVacation()

  const handleCancel = () => {
    mutation.mutate(vacation.id, {
      onSuccess: () => {
        showToast('Ledighetsansökan avbruten', 'success')
        onClose()
      },
    })
  }

  return (
    <Modal
      title="Avbryt ledighetsansökan?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Behåll ansökan</Button>
          <Button variant="danger" loading={mutation.isPending} onClick={handleCancel}>
            Avbryt ansökan
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">
        Din ansökan för{' '}
        <span className="text-text-1 font-medium">
          {formatDateRange(vacation.startDate, vacation.endDate)}
        </span>
        {' '}avbryts. Det går inte att ångra.
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Det gick inte att avbryta ansökan. Försök igen.
        </p>
      )}
    </Modal>
  )
}
