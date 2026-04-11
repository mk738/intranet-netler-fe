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
  type OnboardingChecklistDto,
} from '@/hooks/useOnboarding'

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
  // Use labelSv from backend — no hardcoded map needed
  const label = item.labelSv ?? item.task

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
            background: item.completed ? 'var(--color-purple, #7c3aed)' : 'transparent',
            border:     item.completed ? '2px solid var(--color-purple, #7c3aed)' : '2px solid rgba(107,97,126,0.5)',
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

type LocalState = {
  completed:       boolean
  completedByName: string | null
  completedAt:     string | null
}

export function OnboardingChecklist({ employeeId }: { employeeId: string }) {
  const { data, isLoading }   = useOnboarding(employeeId)
  const toggle                = useToggleOnboardingItem(employeeId)
  const complete              = useCompleteOnboarding(employeeId)
  const { showToast }         = useToast()
  const { employee }          = useAuth()

  const [togglingId, setTogglingId]                 = useState<string | null>(null)
  const [localCompleted, setLocalCompleted]         = useState<Record<string, LocalState>>({})
  const [showModal, setShowModal]                   = useState(false)
  const [showCompleteButton, setShowCompleteButton] = useState(false)
  const [isExpanded, setIsExpanded]                 = useState(false)
  const modalShownForAllDone                        = useRef(false)

  const serverItems: OnboardingItem[] = (data as OnboardingChecklistDto | undefined)?.items ?? []

  const list = serverItems.map(item => {
    const local = localCompleted[item.id]
    return local ? { ...item, ...local } : item
  })

  const isOfficiallyComplete = (data as OnboardingChecklistDto | undefined)?.onboardingComplete ?? false

  // Early return AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  function handleToggle(item: OnboardingItem) {
    const next = !list.find(i => i.id === item.id)?.completed
    const p    = employee?.profile
    const myName = p ? `${p.firstName} ${p.lastName}`.trim() : null

    const localEntry: LocalState = {
      completed:       next,
      completedByName: next ? myName : null,
      completedAt:     next ? new Date().toISOString() : null,
    }

    const nextLocal = { ...localCompleted, [item.id]: localEntry }
    const allNowDone = serverItems.every(si => {
      const local = nextLocal[si.id]
      return local ? local.completed : si.completed
    })
    setLocalCompleted(nextLocal)
    setTogglingId(item.id)

    toggle.mutate(item.id, {
      onSettled: () => {
        setTogglingId(null)
        if (allNowDone && !isOfficiallyComplete && !modalShownForAllDone.current) {
          modalShownForAllDone.current = true
          setShowModal(true)
        }
      },
      onError: () => {
        // Roll back local state for this item on error
        setLocalCompleted(prev => {
          const next = { ...prev }
          delete next[item.id]
          return next
        })
        showToast('Något gick fel. Försök igen.', 'error')
      },
    })
  }

  function handleConfirmComplete() {
    complete.mutate(undefined, {
      onSuccess: () => {
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

  // Derive completion date from latest completed item
  const completedDates = serverItems.map(i => i.completedAt).filter(Boolean) as string[]
  const latestCompletedAt = completedDates.sort().slice(-1)[0] ?? null

  // Compressed "done" view
  if (isOfficiallyComplete && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="card w-full text-left flex items-center gap-2.5 hover:bg-bg-hover transition-colors"
      >
        <div
          className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
          style={{
            background: 'var(--color-purple, #7c3aed)',
            border:     '2px solid var(--color-purple, #7c3aed)',
          }}
        >
          <CheckIcon />
        </div>
        <div>
          <p className="text-sm font-medium text-text-1">Onboarding avklarad</p>
          {latestCompletedAt && (
            <p className="text-xs text-text-3 mt-0.5">{formatSwedishDate(latestCompletedAt)}</p>
          )}
        </div>
      </button>
    )
  }

  return (
    <>
      <div className="card">
        {isOfficiallyComplete && isExpanded && (
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-subtle">
            <span className="text-xs text-text-3">
              Klarmarkerad {latestCompletedAt && formatSwedishDate(latestCompletedAt)}
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

        {!isOfficiallyComplete && showCompleteButton && (
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