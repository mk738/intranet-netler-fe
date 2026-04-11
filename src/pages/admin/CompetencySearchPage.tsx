import { useState, useRef, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import api from '@/lib/api'
import { useEmployees } from '@/hooks/useEmployees'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui'
import type { SkillDto, ApiResponse } from '@/types'

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export function CompetencySearchPage() {
  const navigate                = useNavigate()
  const [keywords, setKeywords] = useState<string[]>([])
  const [input,    setInput]    = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)

  const { data: employees, isLoading: empLoading } = useEmployees()
  const activeEmployees = (employees ?? []).filter(e => e.isActive)

  const skillQueries = useQueries({
    queries: activeEmployees.map(e => ({
      queryKey: ['skills', 'employees', e.id],
      queryFn:  () =>
        api.get<ApiResponse<SkillDto[]>>(`/api/skills/employees/${e.id}`)
           .then(r => r.data.data),
    })),
  })

  const skillsByEmp      = Object.fromEntries(activeEmployees.map((e, i) => [e.id, skillQueries[i]?.data ?? []]))
  const skillLoadingById = Object.fromEntries(activeEmployees.map((e, i) => [e.id, !!skillQueries[i]?.isLoading]))
  const anySkillLoading  = skillQueries.some(q => q.isLoading)

  function addKeyword() {
    const val = normalize(input)
    if (!val || keywords.includes(val)) { setInput(''); return }
    setKeywords(prev => [...prev, val])
    setInput('')
  }

  function removeKeyword(k: string) {
    setKeywords(prev => prev.filter(x => x !== k))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword() }
    if (e.key === 'Backspace' && !input && keywords.length) {
      removeKeyword(keywords[keywords.length - 1])
    }
  }

  const results = (() => {
    if (!activeEmployees.length) return []
    return activeEmployees
      .map(e => {
        const skillsReady = !skillLoadingById[e.id]
        const empSkills   = (skillsByEmp[e.id] ?? []).map(s => normalize(s.name))
        const skillNames  = skillsByEmp[e.id]?.map(s => s.name) ?? []
        const matched     = skillsReady
          ? keywords.filter(k => empSkills.some(s => s.includes(k)))
          : []
        return { employee: e, skillNames, matched, matchCount: matched.length, skillsReady }
      })
      .filter(r => {
        if (keywords.length === 0) return true
        return r.skillsReady && r.matchCount === keywords.length
      })
      .sort((a, b) =>
        keywords.length > 0
          ? b.matchCount - a.matchCount || b.skillNames.length - a.skillNames.length
          : b.skillNames.length - a.skillNames.length
      )
  })()

  const skillsStillLoading = keywords.length > 0 && anySkillLoading

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-1">Kompetenssökning</h1>
        <p className="text-sm text-text-3 mt-1">
          Lägg till sökord för att hitta konsulter med rätt kompetens. Alla sökord måste matcha.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Sök kompetens, t.ex. React, Java, AWS..."
          className="field-input w-full pl-9"
        />
      </div>

      {/* Active tags */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map(k => (
            <span
              key={k}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-bg text-purple-light border border-purple/20"
            >
              {k}
              <button
                onClick={() => removeKeyword(k)}
                className="hover:text-danger transition-colors leading-none ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          {keywords.length > 1 && (
            <button
              onClick={() => setKeywords([])}
              className="text-xs text-text-3 hover:text-text-2 transition-colors px-1"
            >
              Rensa alla
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {empLoading && (
        <div className="flex justify-center py-12"><Spinner /></div>
      )}

      {/* Results */}
      {!empLoading && (
        <div className="space-y-2">

          {/* Counter */}
          {!skillsStillLoading && (
            <p className="text-xs text-text-3">
              {keywords.length === 0
                ? `${results.length} konsult${results.length !== 1 ? 'er' : ''}`
                : results.length === 0
                ? 'Inga konsulter matchar alla sökord'
                : `${results.length} konsult${results.length !== 1 ? 'er' : ''} matchar`}
            </p>
          )}

          {/* Empty state */}
          {keywords.length > 0 && results.length === 0 && !anySkillLoading && (
            <div className="text-center py-16 text-text-3">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-sm">Inga konsulter matchar alla sökord</p>
              <p className="text-xs mt-1 text-text-3">Prova att ta bort något sökord</p>
            </div>
          )}

          {/* Cards */}
          {results.map(({ employee: e, skillNames, matched, matchCount, skillsReady }) => {
            const name     = e.profile
              ? `${e.profile.firstName} ${e.profile.lastName}`.trim()
              : e.email
            const jobTitle = e.profile?.jobTitle ?? null

            return (
              <div
                key={e.id}
                onClick={() => navigate(`/admin/employees/${e.id}`, { state: { backLabel: 'Kompetenssökning', backPath: '/admin/competencies' } })}
                className="bg-bg-card border border-subtle rounded-xl px-4 py-2.5 cursor-pointer hover:border-purple/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={name} avatarUrl={e.profile?.avatarUrl ?? null} size="md" />

                  <div className="flex-1 min-w-0">
                    {/* Name row + match badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <p className="text-[14px] font-medium text-text-1 leading-snug shrink-0">{name}</p>
                        {jobTitle && (
                          <p className="text-[12px] text-text-3 truncate">{jobTitle}</p>
                        )}
                      </div>
                      {keywords.length > 0 && skillsReady && (
                        <span className="shrink-0 text-[11px] font-medium text-purple-light bg-purple-bg border border-purple/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {matchCount} av {keywords.length} matchar
                        </span>
                      )}
                      {keywords.length > 0 && !skillsReady && (
                        <div className="h-5 w-24 rounded-full bg-bg-hover animate-pulse shrink-0" />
                      )}
                    </div>

                    {/* Skills pills */}
                    {skillsReady ? (
                      skillNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {skillNames.map(s => {
                            const isMatch = keywords.length > 0 && matched.some(m => normalize(s).includes(m))
                            return (
                              <span
                                key={s}
                                className={
                                  isMatch
                                    ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-purple-bg text-purple-light border border-purple/30'
                                    : 'px-2 py-0.5 rounded-full text-xs border border-subtle text-text-3'
                                }
                              >
                                {s}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-3 mt-2">Inga kompetenser registrerade</p>
                      )
                    ) : (
                      <div className="flex gap-1.5 mt-1.5">
                        <div className="h-5 w-14 rounded-full bg-bg-hover animate-pulse" />
                        <div className="h-5 w-20 rounded-full bg-bg-hover animate-pulse" />
                        <div className="h-5 w-16 rounded-full bg-bg-hover animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
