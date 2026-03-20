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
          showToast(isApprove ? 'Ansökan godkänd' : 'Ansökan avvisad', 'success')
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      title={isApprove ? 'Godkänn ledighetsansökan?' : 'Avvisa ledighetsansökan?'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          {isApprove ? (
            <Button loading={mutation.isPending} onClick={handleSubmit}>
              Godkänn
            </Button>
          ) : (
            <Button variant="danger" loading={mutation.isPending} onClick={handleSubmit}>
              Avvisa
            </Button>
          )}
        </>
      }
    >
      <p className="text-sm text-text-2">
        <span className="text-text-1 font-medium">{vacation.employeeName}</span> har
        ansökt om{' '}
        <span className="text-text-1 font-medium">{vacation.daysCount} arbetsdag{vacation.daysCount !== 1 ? 'ar' : ''}</span>
        {' '}ledigt från{' '}
        <span className="text-text-1 font-medium">
          {formatDateRange(vacation.startDate, vacation.endDate)}
        </span>
        .
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Det gick inte att {action === 'approve' ? 'godkänna' : 'avvisa'} ansökan. Försök igen.
        </p>
      )}
    </Modal>
  )
}
