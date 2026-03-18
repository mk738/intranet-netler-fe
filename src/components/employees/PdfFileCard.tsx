import { useRef } from 'react'
import { Card, Spinner, EmptyState, Button } from '@/components/ui'

interface Props {
  title:        string
  fileName:     string
  isAdmin:      boolean
  fileData:     { data: string; contentType: string } | null | undefined
  isLoading:    boolean
  isError:      boolean
  isPending:    boolean
  isUploadError: boolean
  onUpload:     (file: File) => void
}

export function PdfFileCard({
  title, fileName, isAdmin,
  fileData, isLoading, isError,
  isPending, isUploadError, onUpload,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFile = () => {
    if (!fileData?.data) return
    const bytes  = atob(fileData.data)
    const buffer = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
    const blob = new Blob([buffer], { type: fileData.contentType ?? 'application/pdf' })
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file)
    e.target.value = ''
  }

  const hasFile = !isLoading && !isError && !!fileData?.data

  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-3">
        <svg className="w-3 h-3 text-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="section-label">{title}</p>
      </div>

      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFile}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : hasFile ? (
        <div className="space-y-2">
          <button
            onClick={openFile}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-subtle hover:border-purple/40 hover:bg-purple-bg/20 transition-colors group"
          >
            <div className="w-9 h-9 rounded-md bg-danger-bg border border-danger/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-danger" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h6v1.5H8V16zm0-6h3v1.5H8V10z"/>
              </svg>
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-medium text-text-1 group-hover:text-purple-light transition-colors truncate">
                {fileName}
              </p>
              <p className="text-xs text-text-3">Klicka för att öppna i nytt fönster</p>
            </div>
            <svg className="w-4 h-4 text-text-3 group-hover:text-purple-light transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-text-3 hover:text-text-2 transition-colors"
            >
              {isPending ? 'Laddar upp…' : 'Ersätt PDF'}
            </button>
          )}
        </div>
      ) : (
        <EmptyState
          title="Ingen fil uppladdad"
          description={isAdmin
            ? `Ladda upp ${title.toLowerCase()} som PDF.`
            : 'Kontakta din administratör för att ladda upp filen.'}
          action={isAdmin ? (
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Ladda upp PDF
            </Button>
          ) : undefined}
        />
      )}

      {isUploadError && (
        <p className="text-xs text-danger mt-2">Uppladdningen misslyckades. Försök igen.</p>
      )}
    </Card>
  )
}
