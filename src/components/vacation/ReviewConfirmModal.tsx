import { Modal, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useReviewVacation } from '@/hooks/useVacations'
import { formatDateRange } from '@/lib/dateUtils'
import type { VacationDto } from '@/types'

interface Props {
  vacation: VacationDto
  action:   'approve' | 'reject'
  onClose:  () => void
}

export function ReviewConfirmModal({ vacation, action, onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useReviewVacation()

  const isApprove = action === 'approve'

  const handleSubmit = () => {
    mutation.mutate(
      { id: vacation.id, data: { approved: isApprove } },
      {
        onSuccess: () => {
          showToast(isApprove ? 'Request approved' : 'Request rejected', 'success')
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      title={isApprove ? 'Approve vacation request?' : 'Reject vacation request?'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {isApprove ? (
            <Button loading={mutation.isPending} onClick={handleSubmit}>
              Approve
            </Button>
          ) : (
            <Button variant="danger" loading={mutation.isPending} onClick={handleSubmit}>
              Reject
            </Button>
          )}
        </>
      }
    >
      <p className="text-sm text-text-2">
        <span className="text-text-1 font-medium">{vacation.employeeName}</span> has
        requested{' '}
        <span className="text-text-1 font-medium">{vacation.daysCount} business day{vacation.daysCount !== 1 ? 's' : ''}</span>
        {' '}off from{' '}
        <span className="text-text-1 font-medium">
          {formatDateRange(vacation.startDate, vacation.endDate)}
        </span>
        .
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Failed to {action} request. Please try again.
        </p>
      )}
    </Modal>
  )
}
