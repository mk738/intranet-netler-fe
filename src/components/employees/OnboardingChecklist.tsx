import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Modal, Button, Spinner } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import {
  useOnboarding,
  useToggleOnboardingItem,
  useCompleteOnboarding,
  type OnboardingItem,
} from '@/hooks/useOnboarding'

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

function PencilIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.5 2.5a1.5 1.5 0 0 1 2.121 2.121L5 13.243 2 14l.757-3L11.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const label = TASK_LABELS[item.task] ?? item.task

  return (
    <div
      className="flex items-start gap-3 py-2.5"
      style={{ opacity: toggling ? 0.5 : 1 }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={toggling}
          className="w-5 h-5 rounded flex items-center justify-center transition-colors focus:outline-none"
          style={{
            background:  item.completed ? 'var(--color-purple, #7c3aed)' : 'transparent',
            border:      item.completed ? '2px solid var(--color-purple, #7c3aed)' : '2px solid rgba(107,97,126,0.5)',
          }}
        >
          {item.completed && <CheckIcon />}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <span
          className="text-sm transition-colors block"
          style={{
            color:          item.completed ? 'var(--tw-text-text-3, #6b617e)' : undefined,
            textDecoration: item.completed ? 'line-through' : 'none',
          }}
        >
          {label}
        </span>
        {item.completed && (item.completedByName || item.completedAt) && (
          <span className="text-xs text-text-3 mt-0.5 block">
            {item.completedByName && `Av ${item.completedByName}`}
            {item.completedByName && item.completedAt && ' · '}
            {item.completedAt && formatSwedishDate(item.completedAt)}
          </span>
        )}
      </div>

      {toggling && (
        <span className="flex-shrink-0 mt-0.5">
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

type LocalState = { completed: boolean; completedByName: string | null; completedAt: string | null }

export function OnboardingChecklist({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useOnboarding(employeeId)
  const toggle    = useToggleOnboardingItem(employeeId)
  const complete  = useCompleteOnboarding(employeeId)
  const { showToast } = useToast()
  const { employee } = useAuth()

  const [togglingId, setTogglingId]             = useState<string | null>(null)
  const [localCompleted, setLocalCompleted]     = useState<Record<string, LocalState>>({})
  const [localCompletedAt, setLocalCompletedAt] = useState<string | null>(null)
  const [showModal, setShowModal]               = useState(false)
  const [showCompleteButton, setShowCompleteButton] = useState(false)
  const [isExpanded, setIsExpanded]             = useState(false)
  const modalShownForAllDone                    = useRef(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  const serverItems: OnboardingItem[] = data?.items?.length ? data.items : FALLBACK_ITEMS

  const list = serverItems.map(item => {
    const local = localCompleted[item.id]
    if (!local) return item
    return { ...item, ...local }
  })

  const allDone = list.length > 0 && list.every(i => i.completed)
  const completedAt = data?.completedAt ?? localCompletedAt
  const isOfficiallyComplete = Boolean(completedAt)

  function handleToggle(item: OnboardingItem) {
    const next = !list.find(i => i.id === item.id)?.completed
    const p = employee?.profile
    const myName = p ? `${p.firstName} ${p.lastName}`.trim() : null
    const localEntry: LocalState = {
      completed:       next,
      completedByName: next ? myName : null,
      completedAt:     next ? new Date().toISOString() : null,
    }
    const nextLocal = { ...localCompleted, [item.id]: localEntry }
    setLocalCompleted(nextLocal)
    setTogglingId(item.id)

    toggle.mutate(item.id, {
      onSettled: () => {
        setTogglingId(null)
        const allNowDone = serverItems.every(si =>
          si.id in nextLocal ? nextLocal[si.id].completed : si.completed
        )
        if (allNowDone && !isOfficiallyComplete && !modalShownForAllDone.current) {
          modalShownForAllDone.current = true
          setShowModal(true)
        }
      },
    })
  }

  function handleConfirmComplete() {
    complete.mutate(undefined, {
      onSuccess: () => {
        setLocalCompletedAt(new Date().toISOString())
        showToast('Onboarding klarmarkerad!', 'success')
        setShowModal(false)
        setShowCompleteButton(false)
        setIsExpanded(false)
        modalShownForAllDone.current = false
      },
      onError: () => {
        showToast('Något gick fel. Försök igen.', 'error')
      },
    })
  }

  function handleDismissModal() {
    setShowModal(false)
    setShowCompleteButton(true)
  }

  // Compressed "done" view
  if (isOfficiallyComplete && !isExpanded) {
    return (
      <>
        <div className="card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--color-purple, #7c3aed)', border: '2px solid var(--color-purple, #7c3aed)' }}
            >
              <CheckIcon />
            </div>
            <div>
              <span className="text-sm font-medium text-text-1">Onboarding avklarad</span>
              {completedAt && (
                <span className="text-xs text-text-3 ml-1.5">
                  · {formatSwedishDate(completedAt!)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-text-3 hover:text-text-1 transition-colors flex-shrink-0 p-1 rounded hover:bg-bg-hover"
            title="Visa checklista"
          >
            <PencilIcon />
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="card">
        {isOfficiallyComplete && isExpanded && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-subtle">
            <span className="text-xs text-text-3">
              Klarmarkerad {completedAt && formatSwedishDate(completedAt)}
              {data?.completedByName && ` av ${data.completedByName}`}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-text-3 hover:text-text-1 transition-colors"
            >
              Komprimera
            </button>
          </div>
        )}

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

        {!isOfficiallyComplete && showCompleteButton && allDone && (
          <div className="mt-4 pt-4 border-t border-subtle">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(true)}
            >
              Klarmarkera onboarding
            </Button>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title="Klarmarkera onboarding?"
          onClose={handleDismissModal}
          footer={
            <>
              <Button variant="secondary" onClick={handleDismissModal}>
                Nej, senare
              </Button>
              <Button loading={complete.isPending} onClick={handleConfirmComplete}>
                Ja, klarmarkera
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-2">
            Alla uppgifter är avbockade. Vill du klarmarkera onboardingen som helt avklarad?
          </p>
        </Modal>
      )}
    </>
  )
}
