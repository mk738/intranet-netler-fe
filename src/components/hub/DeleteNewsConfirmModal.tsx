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
        showToast('Post deleted', 'success')
        navigate('/news')
      },
    })
  }

  return (
    <Modal
      title="Delete post?"
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
        This will permanently delete this news post. All employees will lose access to it.
      </p>

      {mutation.isError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2 mt-4">
          Failed to delete post. Please try again.
        </p>
      )}
    </Modal>
  )
}
