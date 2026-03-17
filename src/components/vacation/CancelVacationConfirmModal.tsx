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
        showToast('Vacation request cancelled', 'success')
        onClose()
      },
    })
  }

  return (
    <Modal
      title="Cancel vacation request?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Keep request</Button>
          <Button variant="danger" loading={mutation.isPending} onClick={handleCancel}>
            Cancel request
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">
        This will cancel your request for{' '}
        <span className="text-text-1 font-medium">
          {formatDateRange(vacation.startDate, vacation.endDate)}
        </span>
        . This cannot be undone.
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Failed to cancel request. Please try again.
        </p>
      )}
    </Modal>
  )
}
