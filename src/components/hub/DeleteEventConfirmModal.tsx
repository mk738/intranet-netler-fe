import { useNavigate } from 'react-router-dom'
import { Modal, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useDeleteEvent } from '@/hooks/useEvents'

interface Props {
  eventId: string
  onClose: () => void
}

export function DeleteEventConfirmModal({ eventId, onClose }: Props) {
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const mutation      = useDeleteEvent()

  const handleDelete = () => {
    mutation.mutate(eventId, {
      onSuccess: () => {
        showToast('Event deleted', 'success')
        navigate('/events')
      },
    })
  }

  return (
    <Modal
      title="Delete event?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={mutation.isPending} onClick={handleDelete}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">
        This will permanently delete this event. It will no longer appear in the calendar.
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Failed to delete event. Please try again.
        </p>
      )}
    </Modal>
  )
}
