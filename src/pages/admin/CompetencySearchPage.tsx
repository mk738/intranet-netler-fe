import { useState, useRef, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import api from '@/lib/api'
import { useEmployees } from '@/hooks/useEmployees'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui'
import type { SkillDto, ApiResponse } from '@/types'

// ── Helpers ────────────────────────────────────────────────────

function normalize(s: string) {
  return s.trim().toLowerCase()
}

// ── Keyword tag input ─────────────────────────────────────────

function KeywordInput({
  keywords,
  onAdd,
  onRemove,
}: {
  keywords: string[]
  onAdd:    (k: string) => void
  onRemove: (k: string) => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add() {
    const val = normalize(input)
    if (!val || keywords.includes(val)) { setInput(''); return }
    onAdd(val)
    setInput('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && keywords.length) {
      onRemove(keywords[keywords.length - 1])
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-wrap gap-2 items-center min-h-[44px] px-3 py-2 rounded-lg border border-subtle bg-bg-input cursor-text"
    >
      {keywords.map(k => (
        <span
          key={k}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-bg text-purple-light border border-purple/20"
        >
          {k}
          <button
            onClick={e => { e.stopPropagation(); onRemove(k) }}
            className="hover:text-danger transition-colors leading-none ml-0.5"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={keywords.length === 0 ? 'Skriv en kompetens och tryck Enter…' : 'Lägg till fler…'}
        className="flex-1 min-w-[200px] bg-transparent text-sm text-text-1 placeholder:text-text-3 outline-none"
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function CompetencySearchPage() {
  const navigate                = useNavigate()
  const [keywords, setKeywords] = useState<string[]>([])

  const { data: employees, isLoading: empLoading } = useEmployees()
  const activeEmployees = (employees ?? []).filter(e => e.isActive)

  // Fetch skills for all active employees in parallel
  const skillQueries = useQueries({
    queries: activeEmployees.map(e => ({
      queryKey: ['skills', 'employees', e.id],
      queryFn:  () =>
        api.get<ApiResponse<SkillDto[]>>(`/api/skills/employees/${e.id}`)
           .then(r => r.data.data),
    })),
  })

  const skillsByEmp  = Object.fromEntries(
    activeEmployees.map((e, i) => [e.id, skillQueries[i]?.data ?? []])
  )
  const skillLoadingById = Object.fromEntries(
    activeEmployees.map((e, i) => [e.id, !!skillQueries[i]?.isLoading])
  )

  function addKeyword(k: string)    { setKeywords(prev => [...prev, k]) }
  function removeKeyword(k: string) { setKeywords(prev => prev.filter(x => x !== k)) }

  const results = (() => {
    if (!activeEmployees.length) return []

    return activeEmployees
      .map(e => {
        const skillsReady = !skillLoadingById[e.id]
        const empSkills   = (skillsByEmp[e.id] ?? []).map(s => normalize(s.name))
        const skillNames  = skillsByEmp[e.id]?.map(s => s.name) ?? []
        // While skills are loading we can't match keywords — exclude from filtered results
        const matched     = skillsReady
          ? keywords.filter(k => empSkills.some(s => s.includes(k)))
          : []
        return { employee: e, skillNames, matched, matchCount: matched.length, skillsReady }
      })
      .filter(r => {
        if (keywords.length === 0) return true
        return r.skillsReady && r.matchCount === keywords.length
      })
      .sort((a, b) => b.skillNames.length - a.skillNames.length)
  })()

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-1">Kompetenssökning</h1>
        <p className="text-sm text-text-3 mt-1">
          Lägg till sökord för att hitta konsulter med rätt kompetens. Alla sökord måste matcha.
        </p>
      </div>

      {/* Keyword input */}
      <KeywordInput keywords={keywords} onAdd={addKeyword} onRemove={removeKeyword} />

      {/* Results */}
      {empLoading && (
        <div className="flex justify-center py-12"><Spinner /></div>
      )}

      {!empLoading && keywords.length > 0 && results.length === 0 && !skillQueries.some(q => q.isLoading) && (
        <div className="text-center py-16 text-text-3">
          <p className="text-4xl mb-3">😔</p>
          <p className="text-sm">Inga konsulter matchar alla sökord</p>
          <p className="text-xs mt-1">Prova att ta bort något sökord</p>
        </div>
      )}

      {!empLoading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-3">
            {keywords.length === 0
              ? `${results.length} konsult${results.length !== 1 ? 'er' : ''}`
              : `${results.length} konsult${results.length !== 1 ? 'er' : ''} matchar`}
          </p>
          <div className="rounded-lg border border-subtle overflow-hidden">
            {results.map(({ employee: e, skillNames, matched, skillsReady }, i) => {
              const name = e.profile
                ? `${e.profile.firstName} ${e.profile.lastName}`
                : e.email
              return (
                <div
                  key={e.id}
                  className={[
                    'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-bg-hover transition-colors',
                    i !== 0 ? 'border-t border-subtle' : '',
                  ].join(' ')}
                  onClick={() => navigate(`/admin/employees/${e.id}`)}
                >
                  <Avatar name={name} avatarUrl={e.profile?.avatarUrl ?? null} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-1">{name}</p>
                      {e.profile?.jobTitle && (
                        <p className="text-xs text-text-3">{e.profile.jobTitle}</p>
                      )}
                    </div>
                    {skillsReady ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {skillNames.map(s => {
                          const isMatch = matched.some(m => normalize(s).includes(m))
                          return (
                            <span
                              key={s}
                              className={[
                                'px-2 py-0.5 rounded-full text-xs font-medium border',
                                isMatch
                                  ? 'bg-purple-bg text-purple-light border-purple/20'
                                  : 'bg-bg-hover text-text-3 border-subtle',
                              ].join(' ')}
                            >
                              {s}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex gap-1.5 mt-1.5">
                        <div className="h-5 w-14 rounded-full bg-bg-hover animate-pulse" />
                        <div className="h-5 w-20 rounded-full bg-bg-hover animate-pulse" />
                        <div className="h-5 w-16 rounded-full bg-bg-hover animate-pulse" />
                      </div>
                    )}
                  </div>
                  {keywords.length > 0 && skillsReady && (
                    <span className="text-xs text-purple-light font-medium shrink-0 mt-0.5">
                      {matched.length}/{keywords.length} träff{matched.length !== 1 ? 'ar' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
