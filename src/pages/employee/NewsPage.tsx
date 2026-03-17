import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNewsFeed, useNewsPost } from '@/hooks/useNews'
import { Button, EmptyState } from '@/components/ui'
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList'
import { Avatar } from '@/components/ui/Avatar'
import { ToastContainer } from '@/components/ui/Toast'
import { formatShortDate } from '@/lib/dateUtils'
import { useAuth } from '@/context/AuthContext'
import type { NewsPostDto } from '@/types'

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Fetches the full post to get coverImageData, shows placeholder while loading. */
function LazyCoverImage({ id }: { id: string }) {
  const { data } = useNewsPost(id)
  if (data?.coverImageData && data?.coverImageType) {
    return (
      <img
        src={`data:${data.coverImageType};base64,${data.coverImageData}`}
        alt=""
        className="w-full max-h-[200px] object-cover rounded-t-lg"
      />
    )
  }
  return (
    <div className="bg-purple-bg/30 h-32 rounded-t-lg flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
           className="text-purple-light/40">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  )
}


function SkeletonCard() {
  return (
    <div className="card p-0 overflow-hidden animate-pulse">
      <div className="bg-bg-hover h-32" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-bg-hover rounded w-3/4" />
        <div className="h-3 bg-bg-hover rounded w-1/3" />
        <div className="h-3 bg-bg-hover rounded w-full" />
        <div className="h-3 bg-bg-hover rounded w-5/6" />
      </div>
    </div>
  )
}

function NewsCard({ post }: { post: NewsPostDto }) {
  const navigate = useNavigate()
  const preview  = stripHtml(post.body).slice(0, 120)

  return (
    <div className={`card p-0 overflow-hidden ${post.pinned ? 'border-l-2 border-purple-light pl-0' : ''}`}>
      {post.hasCoverImage && <LazyCoverImage id={post.id} />}
      <div className="p-4">
        <button
          onClick={() => navigate(`/news/${post.id}`)}
          className="text-left w-full group"
        >
          <p className="text-base font-medium text-text-1 group-hover:text-purple-light transition-colors">
            {post.title}
          </p>
        </button>

        <div className="flex items-center gap-2 mt-2">
          <Avatar name={post.authorName} avatarUrl={null} size="sm" />
          <span className="text-xs text-text-3">{post.authorName}</span>
          <span className="text-xs text-text-3">·</span>
          <span className="text-xs text-text-3">{formatShortDate(post.publishedAt)}</span>
        </div>

        {preview && (
          <p className="text-sm text-text-2 mt-2 line-clamp-2">
            {preview}{(post.body?.length ?? 0) > 120 ? '...' : ''}
          </p>
        )}

        <button
          onClick={() => navigate(`/news/${post.id}`)}
          className="text-xs text-purple-light mt-2 hover:underline"
        >
          Read more →
        </button>
      </div>
    </div>
  )
}

export function NewsPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useNewsFeed(page, 10)
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const posts    = data?.content ?? []
  const pinned   = posts.filter(p => p.pinned)
  const unpinned = posts.filter(p => !p.pinned)
  const totalPages = data?.totalPages ?? 0

  return (
    <>
      <ToastContainer />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-text-1">Company news</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !posts.length ? (
          <EmptyState
            title="Nothing posted yet"
            description="Check back soon for company news and updates."
            action={isAdmin ? <Button onClick={() => navigate('/admin/publish')}>Write first post</Button> : undefined}
          />
        ) : (
          <div className="space-y-6">
            {/* Pinned section */}
            {pinned.length > 0 && (
              <div>
                <p className="section-label mb-3">Pinned</p>
                <AnimatedList className="space-y-3">
                  {pinned.map(p => (
                    <AnimatedListItem key={p.id}>
                      <NewsCard post={p} />
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              </div>
            )}

            {/* Main feed */}
            {unpinned.length > 0 && (
              <AnimatedList className="space-y-4">
                {unpinned.map(p => (
                  <AnimatedListItem key={p.id}>
                    <NewsCard post={p} />
                  </AnimatedListItem>
                ))}
              </AnimatedList>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-text-3">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
