import { useNavigate } from 'react-router-dom'
import { Modal, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useDeleteNews } from '@/hooks/useNews'

interface Props {
  postId:  string
  onClose: () => void
}

export function DeleteNewsConfirmModal({ postId, onClose }: Props) {
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const mutation      = useDeleteNews()

  const handleDelete = () => {
    mutation.mutate(postId, {
      onSuccess: () => {
        showToast('Inlägg borttaget', 'success')
        navigate('/news')
      },
    })
  }

  return (
    <Modal
      title="Ta bort inlägg?"
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
        Det här inlägget tas bort permanent. Alla anställda förlorar åtkomst till det.
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Det gick inte att ta bort inlägget. Försök igen.
        </p>
      )}
    </Modal>
  )
}
