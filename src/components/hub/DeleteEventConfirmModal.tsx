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
        navigate('/events')
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

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Det gick inte att ta bort evenemanget. Försök igen.
        </p>
      )}
    </Modal>
  )
}
