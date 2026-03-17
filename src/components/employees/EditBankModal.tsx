import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useUpdateMyBank } from '@/hooks/useEmployees'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'
import type { BankInfo } from '@/types'

const schema = z.object({
  bankName:       z.string().min(1, 'Bank name is required'),
  accountNumber:  z.string().min(1, 'Account number is required'),
  clearingNumber: z.string().min(1, 'Clearing number is required'),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose:      () => void
  employeeId?:  string
}

export function EditBankModal({ onClose }: Props) {
  const mutation = useUpdateMyBank()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: BankInfo) => {
    mutation.mutate(data, { onSuccess: onClose })
  }

  return (
    <Modal
      title="Edit bank info"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="edit-bank-form" type="submit" loading={mutation.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-bank-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-text-3 bg-bg-hover border border-subtle rounded px-3 py-2">
          Enter the real values — they are stored securely and masked when displayed.
        </p>

        <div>
          <label className="field-label">Bank name</label>
          <input {...register('bankName')} className={clsx('field-input', errors.bankName && 'field-input-error')} placeholder="e.g. Swedbank" />
          <FieldError message={errors.bankName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Clearing number</label>
            <input {...register('clearingNumber')} className={clsx('field-input', errors.clearingNumber && 'field-input-error')} placeholder="8105" />
            <FieldError message={errors.clearingNumber?.message} />
          </div>
          <div>
            <label className="field-label">Account number</label>
            <input {...register('accountNumber')} className={clsx('field-input', errors.accountNumber && 'field-input-error')} placeholder="0000000000" />
            <FieldError message={errors.accountNumber?.message} />
          </div>
        </div>

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
