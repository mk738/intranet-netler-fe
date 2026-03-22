import { useRef } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useUploadAvatar } from '@/hooks/useEmployees'

interface Props {
  employeeId: string
  name:       string
  avatarUrl:  string | null
}

export function AvatarUpload({ employeeId, name, avatarUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload   = useUploadAvatar(employeeId)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate(file)
    e.target.value = ''
  }

  const hasPhoto = !!avatarUrl

  return (
    <div className="relative group w-16 h-16">
      <Avatar name={name} avatarUrl={avatarUrl} size="lg" />

      {/* Overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className={[
          'absolute inset-0 rounded-full flex items-center justify-center transition-all',
          hasPhoto
            ? 'bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100'
            : 'bg-black/30 opacity-100 hover:bg-black/45',
        ].join(' ')}
        title={hasPhoto ? 'Byt profilbild' : 'Lägg till profilbild'}
      >
        {upload.isPending ? (
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : hasPhoto ? (
          /* Pencil icon */
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
          </svg>
        ) : (
          /* Camera icon */
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
