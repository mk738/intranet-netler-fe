import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useReadNews } from '@/context/ReadNewsContext'
import { useNewsFeed } from '@/hooks/useNews'
import { auth } from '@/lib/firebase'
import clsx from 'clsx'

function useUnreadNewsCount() {
  const { data }   = useNewsFeed(0, 10)
  const { isRead } = useReadNews()
  if (!data?.content) return 0
  return data.content.filter(p => !isRead(p.id)).length
}

// ── Icons ──────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconNews() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <line x1="10" y1="7" x2="18" y2="7"/>
      <line x1="10" y1="11" x2="18" y2="11"/>
      <line x1="10" y1="15" x2="14" y2="15"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconVacation() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

function IconOverview() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function IconEmployees() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconPlacements() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )
}

function IconVacationAdmin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )
}

function IconCRM() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function IconCompetency() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  )
}

function IconBoards() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1"/>
      <rect x="10" y="3" width="5" height="11" rx="1"/>
      <rect x="17" y="3" width="5" height="15" rx="1"/>
    </svg>
  )
}

function IconPostNews() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

function IconFaq() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

// function IconPipeline() — reserved for Kandidatpipeline if re-enabled

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconSignOut() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

// ── Link definitions ───────────────────────────────────────────

const employeeLinks = [
  { to: '/dashboard', label: 'Startsida',    icon: <IconDashboard /> },
  { to: '/news',      label: 'Nyheter',      icon: <IconNews />      },
  { to: '/events',    label: 'Evenemang',    icon: <IconCalendar />  },
  { to: '/vacation',  label: 'Ledighet',     icon: <IconVacation />  },
  { to: '/profile',   label: 'Min profil',   icon: <IconProfile />   },
  { to: '/faq',       label: 'FAQ',          icon: <IconFaq />       },
]

const adminLinks = [
  { to: '/admin',                  label: 'Översikt',          icon: <IconOverview />      },
  { to: '/admin/employees',        label: 'Anställda',         icon: <IconEmployees />     },
  { to: '/admin/placements',       label: 'Placeringar',       icon: <IconPlacements />    },
  { to: '/admin/competencies',     label: 'Kompetenssökning',  icon: <IconCompetency />    },
  { to: '/admin/vacations',        label: 'Ledighet',          icon: <IconVacationAdmin /> },
  { to: '/admin/crm',              label: 'CRM',               icon: <IconCRM />           },
  { to: '/admin/boards',           label: 'Boards',            icon: <IconBoards />        },
  { to: '/admin/publish',          label: 'Publicera',         icon: <IconPostNews />      },
  // { to: '/admin/pipeline',         label: 'Kandidatpipeline',  icon: <IconPipeline />      },
]

// ── Sidebar ────────────────────────────────────────────────────

export function Sidebar() {
  const { isAdmin, isSuperAdmin, employee } = useAuth()
  const navigate                            = useNavigate()
  const unreadNews                          = useUnreadNewsCount()

  const initials = employee?.profile
    ? `${employee.profile.firstName[0]}${employee.profile.lastName[0]}`.toUpperCase()
    : employee?.email[0].toUpperCase() ?? '?'

  const displayName = employee?.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName}`
    : employee?.email ?? ''

  return (
    <aside className="w-52 bg-sidebar border-r border-subtle flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-subtle">
        <div className="flex items-baseline">
          <span className="text-white font-bold text-lg tracking-tight leading-none">intra</span><span className="text-purple-light font-bold text-lg tracking-tight leading-none">NETLER</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <p className="section-label px-5 pt-3 pb-1">Allmänt</p>
        {employeeLinks.map(({ to, label, icon }) => (
          <SidebarItem
            key={to}
            to={to}
            label={label}
            icon={icon}
            badge={to === '/news' && unreadNews > 0 ? unreadNews : undefined}
          />
        ))}

        {isAdmin && (
          <>
            <p className="section-label px-5 pt-5 pb-1">Admin</p>
            {adminLinks.map(({ to, label, icon }) => (
              <SidebarItem key={to} to={to} label={label} icon={icon} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-subtle px-3 py-3 space-y-1">
        {/* Inställningar */}
        <button
          onClick={() => navigate(isSuperAdmin ? '/admin/settings' : '/profile')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-text-2
                     hover:bg-bg-hover hover:text-text-1 transition-colors"
        >
          <span className="shrink-0 text-text-3"><IconSettings /></span>
          Inställningar
        </button>

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-bg-hover transition-colors group">
          <div className="w-7 h-7 rounded-full bg-purple-bg border border-purple/30 flex items-center justify-center text-[10px] font-semibold text-purple-light shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-1 truncate">{displayName}</p>
          </div>
          <button
            onClick={() => auth.signOut()}
            title="Logga ut"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-danger p-0.5"
          >
            <IconSignOut />
          </button>
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ to, label, icon, badge }: { to: string; label: string; icon: React.ReactNode; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center gap-2.5 mx-2 px-3 py-2 rounded text-sm transition-colors overflow-hidden',
          isActive
            ? 'text-purple-light font-medium'
            : 'text-text-2 hover:bg-bg-hover hover:text-text-1'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-indicator"
              className="absolute inset-0 bg-purple-bg rounded"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          )}
          <span className={clsx('shrink-0 relative z-10', isActive ? 'text-purple-light' : 'text-text-3')}>
            {icon}
          </span>
          <span className="relative z-10 flex-1">{label}</span>
          {badge !== undefined && (
            <span className="relative z-10 ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-purple-light text-[10px] font-bold text-bg leading-none">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
