import { useContract, useUploadContract } from '@/hooks/useEmployees'
import { PdfFileCard } from './PdfFileCard'

interface Props {
  employeeId: string
  isAdmin:    boolean
}

export function EmploymentContractCard({ employeeId, isAdmin }: Props) {
  const { data, isLoading, isError }  = useContract(employeeId)
  const upload                        = useUploadContract(employeeId)

  return (
    <PdfFileCard
      title="Anställningsavtal"
      fileName="Anställningsavtal.pdf"
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
