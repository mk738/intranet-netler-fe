import { useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Spinner } from '@/components/ui'
import { useOnboarding, useToggleOnboardingItem, type OnboardingItem } from '@/hooks/useOnboarding'

const TASK_LABELS: Record<string, string> = {
  CREATE_CV:             'Skapa CV',
  NETLER_MAIL:           'Netler-mail via Google Admin',
  BIRTHDAY_IN_SLACK:     'Lägg in födelsedag i Slack',
  SLACK_INVITATION:      'Slack-inbjudan till Netler-mail',
  FORTNOX_ADD_USER:      'Fortnox: Lägg till i kvitton & utlägg',
  FORTNOX_RECEIPT_GROUP: 'Fortnox: Lägg till i kvittogruppen',
  SLACK_WELCOME_MESSAGE: 'Skriv välkommen i Slack-kanalen',
  SLACK_PROFILE_PHOTO:   'Be om profilbild till Slack',
  SEND_WELCOME_LETTER:   'Skicka välkomstbrev till Netler-mail',
  REQUEST_BANK_DETAILS:  'Be om bankuppgifter',
  NOTIFY_PAYROLL:        'Meddela löneavdelningen',
  SETUP_PENSION:         'Lägg upp pension',
}

function formatSwedishDate(iso: string): string {
  return format(new Date(iso), 'd MMMM yyyy', { locale: sv })
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


function CheckboxRow({
  item,
  toggling,
  onToggle,
}: {
  item:     OnboardingItem
  toggling: boolean
  onToggle: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const label = TASK_LABELS[item.task] ?? item.task

  return (
    <div
      className="relative flex items-center gap-3 py-2"
      style={{ opacity: toggling ? 0.5 : 1 }}
    >
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={onToggle}
          disabled={toggling}
          onMouseEnter={() => item.completed && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-5 h-5 rounded flex items-center justify-center transition-colors focus:outline-none"
          style={{
            background:  item.completed ? 'var(--color-purple, #7c3aed)' : 'transparent',
            border:      item.completed ? '2px solid var(--color-purple, #7c3aed)' : '2px solid rgba(107,97,126,0.5)',
          }}
        >
          {item.completed && <CheckIcon />}
        </button>

        {showTooltip && item.completed && item.completedByName && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
            <div className="bg-bg-card border border-subtle rounded-lg px-3 py-1.5 text-xs text-text-2 whitespace-nowrap shadow-modal">
              Bokad av {item.completedByName}
              {item.completedAt && ` · ${formatSwedishDate(item.completedAt)}`}
            </div>
          </div>
        )}
      </div>

      <span
        className="text-sm transition-colors"
        style={{
          color:          item.completed ? 'var(--tw-text-text-3, #6b617e)' : undefined,
          textDecoration: item.completed ? 'line-through' : 'none',
        }}
      >
        {label}
      </span>

      {toggling && (
        <span className="ml-auto">
          <Spinner size="sm" />
        </span>
      )}
    </div>
  )
}

const FALLBACK_ITEMS: OnboardingItem[] = Object.keys(TASK_LABELS).map(task => ({
  id:              task,
  task,
  completed:       false,
  completedAt:     null,
  completedByName: null,
}))

export function OnboardingChecklist({ employeeId }: { employeeId: string }) {
  const { data: items, isLoading } = useOnboarding(employeeId)
  const toggle = useToggleOnboardingItem(employeeId)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  const baseList: OnboardingItem[] = items?.length ? items : FALLBACK_ITEMS

  const list = baseList.map(item => ({
    ...item,
    completed: item.id in localCompleted ? localCompleted[item.id] : item.completed,
  }))

  function handleToggle(item: OnboardingItem) {
    const next = !list.find(i => i.id === item.id)?.completed
    setLocalCompleted(prev => ({ ...prev, [item.id]: next }))
    setTogglingId(item.id)
    toggle.mutate(item.id, {
      onSettled: () => setTogglingId(null),
    })
  }

  return (
    <div className="card">
      <div className="divide-y divide-subtle">
        {list.map((item: OnboardingItem) => (
          <CheckboxRow
            key={item.id}
            item={item}
            toggling={togglingId === item.id}
            onToggle={() => handleToggle(item)}
          />
        ))}
      </div>
    </div>
  )
}
