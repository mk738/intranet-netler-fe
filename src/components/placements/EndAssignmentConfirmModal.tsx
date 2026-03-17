import { useState } from 'react'
import { format } from 'date-fns'
import { Modal, Button } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { useEndAssignment } from '@/hooks/usePlacements'
import { useToast } from '@/components/ui/Toast'
import type { AssignmentDto } from '@/types'

interface Props {
  assignment: AssignmentDto
  onClose:    () => void
}

export function EndAssignmentConfirmModal({ assignment, onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useEndAssignment()
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleEnd = () => {
    mutation.mutate({ id: assignment.id, endDate }, {
      onSuccess: () => {
        showToast('Assignment ended', 'success')
        onClose()
      },
    })
  }

  return (
    <Modal
      title="End assignment?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={mutation.isPending} onClick={handleEnd}>
            End assignment
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2 mb-5">
        This will mark{' '}
        <span className="text-text-1 font-medium">{assignment.fullName}</span>'s
        assignment at{' '}
        <span className="text-text-1 font-medium">{assignment.companyName}</span>
        {' '}({assignment.projectName}) as ended.
      </p>

      <div>
        <label className="field-label">End date</label>
        <DatePicker
          value={endDate}
          onChange={setEndDate}
          min={assignment.startDate}
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Failed to end assignment. Please try again.
        </p>
      )}
    </Modal>
  )
}
