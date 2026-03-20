import { useCV, useUploadCV } from '@/hooks/useEmployees'
import { PdfFileCard } from './PdfFileCard'

interface Props {
  employeeId: string
  isAdmin:    boolean
}

export function CvCard({ employeeId, isAdmin }: Props) {
  const { data, isLoading, isError } = useCV(employeeId)
  const upload                       = useUploadCV(employeeId)

  return (
    <PdfFileCard
      title="CV"
      fileName="CV.pdf"
      isAdmin={isAdmin}
      fileData={data}
      isLoading={isLoading}
      isError={isError}
      isPending={upload.isPending}
      isUploadError={upload.isError}
      uploadError={upload.error}
      onUpload={file => upload.mutate(file)}
    />
  )
}
