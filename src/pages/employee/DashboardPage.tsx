import { useNavigate } from 'react-router-dom'
import { format, endOfMonth } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { Card, Spinner } from '@/components/ui'
import { useNewsFeed } from '@/hooks/useNews'
import { useEvents } from '@/hooks/useEvents'
import { useMyVacations } from '@/hooks/useVacations'

// ── Greeting ──────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'God morgon'
  if (h >= 12 && h < 18) return 'God eftermiddag'
  return 'God kväll'
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-purple-bg border border-purple/20 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-text-1 leading-none">{value}</p>
        <p className="text-xs text-text-3 mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function DashboardPage() {
  const { employee } = useAuth()
  const navigate     = useNavigate()
  const now          = new Date()
  const firstName    = employee?.profile?.firstName ?? 'there'

  const today    = format(now, 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: newsData,  isLoading: newsLoading  } = useNewsFeed(0, 3)
  const { data: events,    isLoading: eventsLoading } = useEvents(today, monthEnd)
  const { data: vacations }                           = useMyVacations()

  const news             = newsData?.content ?? []
  const pendingVacations = (vacations ?? []).filter(v => v.status === 'PENDING').length

  return (
    <div className="max-w-4xl space-y-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-text-1">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-text-3 mt-1">
          {format(now, 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Evenemang denna månad" value={events?.length ?? 0}        icon="📅" />
        <StatCard label="Väntande ledighet"    value={pendingVacations}            icon="🏖️" />
        <StatCard label="Nyheter"              value={newsData?.totalElements ?? 0} icon="📰" />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Latest news */}
        <Card title="Senaste nyheter">
          {newsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !news.length ? (
            <p className="text-sm text-text-3 px-3 py-4">Inga nyheter ännu.</p>
          ) : (
            <ul className="space-y-1">
              {news.map(post => (
                <li key={post.id}>
                  <button
                    onClick={() => navigate(`/news/${post.id}`)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-bg-hover transition-colors group"
                  >
                    <p className="text-sm text-text-1 group-hover:text-purple-light transition-colors line-clamp-1">
                      {post.title}
                    </p>
                    <p className="text-xs text-text-3 mt-0.5">
                      {post.authorName} · {format(new Date(post.publishedAt), 'MMM d')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Upcoming events */}
        <Card title="Kommande evenemang">
          {eventsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !(events ?? []).length ? (
            <p className="text-sm text-text-3 px-3 py-4">Inga kommande evenemang.</p>
          ) : (
            <ul className="space-y-1">
              {(events ?? []).slice(0, 3).map(event => (
                <li key={event.id} className="px-3 py-2.5 rounded-lg hover:bg-bg-hover transition-colors">
                  <p className="text-sm text-text-1 line-clamp-1">{event.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-purple-light">
                      {format(new Date(event.eventDate.slice(0, 10) + 'T00:00:00'), 'MMM d')}
                    </p>
                    {event.location && (
                      <p className="text-xs text-text-3 truncate">{event.location}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
