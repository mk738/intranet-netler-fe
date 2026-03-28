import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNewsFeed, useNewsPost } from '@/hooks/useNews'
import { Button, EmptyState } from '@/components/ui'
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList'
import { Avatar } from '@/components/ui/Avatar'

import { formatShortDate } from '@/lib/dateUtils'
import { useAuth } from '@/context/AuthContext'
import { useReadNews } from '@/context/ReadNewsContext'
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

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-bg-hover text-text-3 border border-subtle">
      {category}
    </span>
  )
}

function NewsCard({ post }: { post: NewsPostDto }) {
  const navigate   = useNavigate()
  const { isRead } = useReadNews()
  const preview    = stripHtml(post.body).slice(0, 120)
  const unread     = !isRead(post.id)

  return (
    <div className={`card p-0 overflow-hidden ${post.pinned ? 'border-l-2 border-purple-light pl-0' : ''}`}>
      {post.hasImage && <LazyCoverImage id={post.id} />}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => navigate(`/news/${post.id}`)}
            className="text-left flex-1 group"
          >
            <p className="text-base font-medium text-text-1 group-hover:text-purple-light transition-colors">
              {post.title}
            </p>
          </button>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {post.category && <CategoryBadge category={post.category} />}
            {unread && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-bg text-purple-light border border-purple/30">
                Ny
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Avatar name={post.authorName} avatarUrl={null} size="sm" />
          <span className="text-xs text-text-3">{post.authorName}</span>
          <span className="text-xs text-text-3">·</span>
          <span className="text-xs text-text-3">{formatShortDate(post.publishedAt ?? post.createdAt)}</span>
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
          Läs mer →
        </button>
      </div>
    </div>
  )
}

export function NewsPage() {
  const [page,     setPage]     = useState(0)
  const [category, setCategory] = useState<string | null>(null)
  const { data, isLoading } = useNewsFeed(page, 10)
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const allPosts   = data?.content ?? []
  const categories = [...new Set(allPosts.map(p => p.category).filter(Boolean) as string[])].sort()

  const posts      = category ? allPosts.filter(p => p.category === category) : allPosts
  const pinned     = posts.filter(p => p.pinned)
  const unpinned   = posts.filter(p => !p.pinned)
  const totalPages = data?.totalPages ?? 0

  const handleCategoryClick = (cat: string | null) => {
    setCategory(prev => prev === cat ? null : cat)
    setPage(0)
  }

  return (
    <>

      <div className="max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-text-1">Företagsnyheter</h1>

        {/* Category filter pills */}
        {!isLoading && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryClick(null)}
              className={`pill ${category === null ? 'pill-active' : ''}`}
            >
              Alla
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`pill ${category === cat ? 'pill-active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !posts.length ? (
          <EmptyState
            title="Inget publicerat ännu"
            description="Kom tillbaka snart för företagsnyheter och uppdateringar."
            action={isAdmin ? <Button onClick={() => navigate('/admin/publish')}>Skriv första inlägg</Button> : undefined}
          />
        ) : (
          <div className="space-y-6">
            {/* Pinned section */}
            {pinned.length > 0 && (
              <div>
                <p className="section-label mb-3">Fästa inlägg</p>
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
                  ← Föregående
                </Button>
                <span className="text-sm text-text-3">
                  Sida {page + 1} av {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Nästa →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
