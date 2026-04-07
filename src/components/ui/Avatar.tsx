import { useState, useEffect } from 'react'
import { getIdToken } from '@/lib/firebase'

function useAvatarSrc(avatarUrl: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!avatarUrl) { setSrc(null); return }

    // Firebase Storage, other public CDN URLs, or pre-signed S3/MinIO URLs — use directly as img src
    if (
      avatarUrl.includes('firebasestorage.googleapis.com') ||
      avatarUrl.includes('storage.googleapis.com') ||
      avatarUrl.includes('X-Amz-Signature')
    ) {
      setSrc(avatarUrl)
      return
    }

    // Relative or backend URLs: fetch with auth token.
    // Using native fetch (not axios) so the browser automatically strips the
    // Authorization header when following a cross-origin redirect to Firebase,
    // avoiding CORS errors on the storage bucket.
    let cancelled = false
    let objectUrl: string | null = null

    getIdToken()
      .then(token =>
        fetch(avatarUrl, { headers: { Authorization: `Bearer ${token}` } })
      )
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.blob()
      })
      .then(blob => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob)
          setSrc(objectUrl)
        }
      })
      .catch(() => { if (!cancelled) setSrc(null) })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [avatarUrl])

  return src
}

const PALETTES: { bg: string; text: string }[] = [
  { bg: '#2e1e4a', text: '#9d5ff5' },
  { bg: '#0d2e22', text: '#10b981' },
  { bg: '#2d1f06', text: '#f59e0b' },
  { bg: '#2d1010', text: '#f87171' },
  { bg: '#1a1f35', text: '#6b8cff' },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function getPalette(name: string) {
  const code = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return PALETTES[code % PALETTES.length]
}

const SIZES = {
  sm: { outer: 'w-6 h-6',   text: 'text-[9px]'  },
  md: { outer: 'w-8 h-8',   text: 'text-xs'     },
  lg: { outer: 'w-16 h-16', text: 'text-xl'     },
}

interface AvatarProps {
  name:      string
  avatarUrl: string | null
  size:      'sm' | 'md' | 'lg'
}

export function Avatar({ name, avatarUrl, size }: AvatarProps) {
  const { outer, text } = SIZES[size]
  const palette          = getPalette(name)
  const src              = useAvatarSrc(avatarUrl)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${outer} rounded-full object-cover flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${outer} rounded-full flex items-center justify-center flex-shrink-0 font-semibold`}
      style={{ backgroundColor: palette.bg, color: palette.text }}
    >
      <span className={text}>{getInitials(name)}</span>
    </div>
  )
}
