import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useNewsPost, usePublishNews } from '@/hooks/useNews'
import { useAuth } from '@/context/AuthContext'
import { useReadNews } from '@/context/ReadNewsContext'
import { Avatar } from '@/components/ui/Avatar'

import { RichTextEditor } from '@/components/hub/RichTextEditor'
import { DeleteNewsConfirmModal } from '@/components/hub/DeleteNewsConfirmModal'
import { Button, EmptyState } from '@/components/ui'
import { formatShortDate } from '@/lib/dateUtils'

function SkeletonDetail() {
  return (
    <div className="max-w-2xl space-y-4 animate-pulse">
      <div className="h-3 w-20 bg-bg-hover rounded" />
      <div className="bg-bg-hover h-56 rounded-xl" />
      <div className="h-6 bg-bg-hover rounded w-3/4" />
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-bg-hover rounded-full" />
        <div className="h-3 w-32 bg-bg-hover rounded" />
      </div>
      <div className="border-b border-subtle" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 bg-bg-hover rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

export function NewsDetailPage() {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const { isAdmin }     = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { markAsRead } = useReadNews()
  const { data: post, isLoading, isError } = useNewsPost(id ?? '')
  const publishMutation = usePublishNews(id ?? '')

  useEffect(() => {
    if (id) markAsRead(id)
  }, [id, markAsRead])

  if (isLoading) return <SkeletonDetail />

  if (isError || !post) {
    return (
      <EmptyState
        title="Inlägg hittades inte"
        description="Det här inlägget kan ha tagits bort."
        action={<Button variant="secondary" onClick={() => navigate('/news')}>← Tillbaka till nyheter</Button>}
      />
    )
  }

  return (
    <>

      <div className="max-w-2xl space-y-6">
        {/* Back link */}
        <Link to="/news" className="text-sm text-text-3 hover:text-text-1 transition-colors">
          ← Nyheter
        </Link>

        {/* Cover image */}
        {post.hasCoverImage && post.coverImageData && post.coverImageType && (
          <img
            src={`data:${post.coverImageType};base64,${post.coverImageData}`}
            alt={post.title}
            className="w-full max-h-[360px] object-cover rounded-xl"
          />
        )}

        {/* Title */}
        <h1 className="text-2xl font-semibold text-text-1">{post.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar name={post.authorName} avatarUrl={null} size="sm" />
          <span className="text-sm text-text-2">{post.authorName}</span>
          <span className="text-text-3">·</span>
          <span className="text-sm text-text-3">{formatShortDate(post.publishedAt ?? post.createdAt)}</span>
          {post.category && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-bg-hover text-text-3 border border-subtle ml-1">
              {post.category}
            </span>
          )}
          {post.pinned && (
            <span className="badge-active ml-1">Fäst</span>
          )}
        </div>

        <div className="border-b border-subtle" />

        {/* Body */}
        <RichTextEditor content={post.body} onChange={() => void 0} readOnly />

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => navigate(`/admin/news/${post.id}/edit`)}
            >
              Redigera inlägg
            </Button>
            {!post.publishedAt && (
              <Button
                loading={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                Publicera
              </Button>
            )}
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Ta bort inlägg
            </Button>
          </div>
        )}
      </div>

      {deleteOpen && (
        <DeleteNewsConfirmModal
          postId={post.id}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  )
}
