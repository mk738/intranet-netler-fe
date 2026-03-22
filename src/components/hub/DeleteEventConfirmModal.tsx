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
        showToast('Evenemang borttaget', 'success')
        onClose()
        navigate('/events')
      },
      onError: () => {
        showToast('Det gick inte att ta bort evenemanget', 'error')
      },
    })
  }

  return (
    <Modal
      title="Ta bort evenemang?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button variant="danger" loading={mutation.isPending} onClick={handleDelete}>
            Ta bort
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">
        Det här evenemanget tas bort permanent. Det visas inte längre i kalendern.
      </p>

    </Modal>
  )
}
