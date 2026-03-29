import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface Props {
  value:    File | null
  onChange: (value: File | null) => void
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export function CoverImageUpload({ value, onChange }: Props) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const handleFile = (file: File) => {
    setError(null)
    if (file.size > MAX_BYTES) {
      setError('Filen överstiger 5 MB-gränsen.')
      return
    }
    onChange(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so selecting the same file again re-triggers
    e.target.value = ''
  }

  if (value && previewUrl) {
    return (
      <div className="space-y-2">
        <img
          src={previewUrl}
          alt="Cover preview"
          className="w-full max-h-[200px] object-cover rounded-lg"
        />
        <Button variant="danger" size="sm" onClick={() => onChange(null)}>
          Ta bort bild
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-mild rounded-lg bg-bg-hover
                   min-h-[120px] flex flex-col items-center justify-center gap-1
                   hover:border-purple/50 transition-colors cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             className="text-text-3">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <p className="text-text-3 text-sm mt-1">Klicka för att ladda upp omslagsbild</p>
        <p className="text-text-3 text-xs">JPG, PNG, WebP, GIF upp till 5MB</p>
      </button>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
