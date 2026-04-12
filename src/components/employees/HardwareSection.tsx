import { useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useHardware, useAddHardware, useRemoveHardware } from '@/hooks/useHardware'

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function HardwareSection({ employeeId }: { employeeId: string }) {
  const { data: items = [], isLoading } = useHardware(employeeId)
  const add    = useAddHardware(employeeId)
  const remove = useRemoveHardware(employeeId)

  const [input,       setInput]       = useState('')
  const [inputError,  setInputError]  = useState(false)
  const [confirmId,   setConfirmId]   = useState<string | null>(null)

  function handleAdd() {
    if (!input.trim()) { setInputError(true); return }
    setInputError(false)
    add.mutate(input.trim(), {
      onSuccess: () => setInput(''),
    })
  }

  function handleRemove(id: string) {
    remove.mutate(id, {
      onSuccess: () => setConfirmId(null),
    })
  }

  return (
    <div className="bg-bg-card border border-subtle rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-subtle">
        <p className="text-sm font-medium text-text-1">Hårdvara</p>
      </div>

      <div className="p-5 space-y-4">

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-text-3">Laddar…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-3">Ingen hårdvara registrerad</p>
        ) : (
          <div className="divide-y divide-subtle">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[13px] text-text-1">{item.name}</p>
                  <p className="text-xs text-text-3 mt-0.5">
                    Tillagd {format(new Date(item.createdAt), 'd MMMM yyyy', { locale: sv })}
                  </p>
                </div>

                {confirmId === item.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-text-2">Ta bort?</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={remove.isPending}
                      className="text-xs border border-danger/40 text-danger px-2 py-0.5 rounded-lg hover:bg-danger-bg transition-colors disabled:opacity-50"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs border border-subtle text-text-2 px-2 py-0.5 rounded-lg hover:bg-bg-hover transition-colors"
                    >
                      Nej
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(item.id)}
                    className="text-text-3 hover:text-danger transition-colors shrink-0"
                    title="Ta bort"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="pt-2 border-t border-subtle">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                value={input}
                onChange={e => { setInput(e.target.value); setInputError(false) }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder='t.ex. MacBook Pro 14"'
                className={`field-input w-full ${inputError ? 'border-danger' : ''}`}
              />
              {inputError && (
                <p className="text-xs text-danger mt-1">Ange ett namn</p>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={add.isPending}
              className="btn-primary text-sm px-3 py-2 shrink-0 disabled:opacity-50"
            >
              {add.isPending ? '…' : 'Lägg till'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
