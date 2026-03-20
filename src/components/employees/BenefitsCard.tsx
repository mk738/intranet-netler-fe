import { useState } from 'react'
import { useBenefits, useUpsertBenefits } from '@/hooks/useEmployees'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'
import type { BenefitDto } from '@/types'

const BENEFIT_ICONS: Record<string, string> = {
  friskvård:  '🏃',
  telefon:    '📱',
  hörlurar:  '🎧',
  försäkring: '🛡️',
  dator:      '💻',
  pension:    '🏦',
}

function benefitIcon(name: string): string {
  const key = name.toLowerCase()
  for (const [k, v] of Object.entries(BENEFIT_ICONS)) {
    if (key.includes(k)) return v
  }
  return '✦'
}

interface Props {
  employeeId: string
  isAdmin:    boolean
}

export function BenefitsCard({ employeeId, isAdmin }: Props) {
  const { data: benefits, isLoading } = useBenefits(employeeId)
  const upsertMutation                = useUpsertBenefits(employeeId)

  const [editing,  setEditing]  = useState(false)
  const [editList, setEditList] = useState<Array<{ name: string; description: string }>>([])

  const startEdit = () => {
    setEditList((benefits ?? []).map(b => ({ name: b.name, description: b.description ?? '' })))
    setEditing(true)
  }

  const addRow    = () => setEditList(l => [...l, { name: '', description: '' }])
  const removeRow = (i: number) => setEditList(l => l.filter((_, idx) => idx !== i))
  const setField  = (i: number, field: 'name' | 'description', val: string) =>
    setEditList(l => l.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const save = () => {
    upsertMutation.mutate(
      editList
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), description: r.description.trim() || null })),
      { onSuccess: () => setEditing(false) }
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4H5.45a4 4 0 00-3.971 3.545L1 9h22l-.48-3.455A4 4 0 0019.55 2H16a4 4 0 00-4 4zM1 9h22v2a6 6 0 01-6 6H7a6 6 0 01-6-6V9z" />
          </svg>
          <p className="section-label">Förmåner</p>
        </div>
        {isAdmin && !editing && (
          <Button variant="secondary" size="sm" onClick={startEdit}>
            {(benefits?.length ?? 0) > 0 ? 'Redigera' : 'Lägg till'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : editing ? (
        <div className="space-y-2">
          {editList.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="field-input flex-1 text-xs py-1.5"
                placeholder="Förmån (t.ex. Friskvårdsbidrag)"
                value={row.name}
                onChange={e => setField(i, 'name', e.target.value)}
              />
              <input
                className="field-input flex-1 text-xs py-1.5"
                placeholder="Värde (t.ex. 5 000 kr / år)"
                value={row.description}
                onChange={e => setField(i, 'description', e.target.value)}
              />
              <button
                onClick={() => removeRow(i)}
                className="text-text-3 hover:text-danger transition-colors text-base leading-none"
              >×</button>
            </div>
          ))}
          <button onClick={addRow} className="text-xs text-purple-light hover:underline">
            + Lägg till förmån
          </button>
          <div className="flex gap-2 pt-1">
            <Button size="sm" loading={upsertMutation.isPending} onClick={save}>Spara</Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Avbryt</Button>
          </div>
        </div>
      ) : !benefits?.length ? (
        <EmptyState
          title="Inga förmåner tillagda"
          description={isAdmin
            ? 'Lägg till förmåner för den anställde.'
            : 'Kontakta din administratör för information om förmåner.'}
          action={isAdmin
            ? <Button variant="secondary" size="sm" onClick={startEdit}>Lägg till</Button>
            : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {(benefits as BenefitDto[]).map(b => (
            <li key={b.id} className="flex items-center gap-2.5">
              <span className="text-base leading-none w-5 text-center flex-shrink-0">
                {benefitIcon(b.name)}
              </span>
              <span className="text-sm text-text-1 font-medium">{b.name}</span>
              {b.description && (
                <>
                  <span className="text-text-3 text-xs">·</span>
                  <span className="text-xs text-text-2">{b.description}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
