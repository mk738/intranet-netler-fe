import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useUpdateMyBank } from '@/hooks/useEmployees'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError, getApiCode } from '@/lib/api'
import type { BankInfo } from '@/types'

const schema = z.object({
  bankName:       z.string().min(1, 'Banknamn krävs'),
  accountNumber:  z.string().min(1, 'Kontonummer krävs'),
  clearingNumber: z.string().min(1, 'Clearingnummer krävs'),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose:      () => void
  employeeId?:  string
}

export function EditBankModal({ onClose }: Props) {
  const mutation = useUpdateMyBank()

  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: BankInfo) => {
    mutation.mutate(data, {
      onSuccess: onClose,
      onError: (err: unknown) => {
        const code = getApiCode(err)
        if (code === 'BANK_INVALID_CLEARING') {
          setError('clearingNumber', { message: 'Ogiltigt clearingnummer.' })
        } else if (code === 'BANK_INVALID_ACCOUNT') {
          setError('accountNumber', { message: 'Ogiltigt kontonummer.' })
        }
      },
    })
  }

  return (
    <Modal
      title="Redigera bankinformation"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="edit-bank-form" type="submit" loading={mutation.isPending}>
            Spara ändringar
          </Button>
        </>
      }
    >
      <form id="edit-bank-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-text-3 bg-bg-hover border border-subtle rounded px-3 py-2">
          Ange de verkliga värdena — de lagras säkert och maskeras vid visning.
        </p>

        <div>
          <label className="field-label">Banknamn</label>
          <input {...register('bankName')} className={clsx('field-input', errors.bankName && 'field-input-error')} placeholder="t.ex. Swedbank" />
          <FieldError message={errors.bankName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Clearingnummer</label>
            <input {...register('clearingNumber')} className={clsx('field-input', errors.clearingNumber && 'field-input-error')} placeholder="8105" />
            <FieldError message={errors.clearingNumber?.message} />
          </div>
          <div>
            <label className="field-label">Kontonummer</label>
            <input {...register('accountNumber')} className={clsx('field-input', errors.accountNumber && 'field-input-error')} placeholder="0000000000" />
            <FieldError message={errors.accountNumber?.message} />
          </div>
        </div>

        {mutation.isError && !getApiCode(mutation.error) && (
          <FormError message={getApiError(mutation.error)} />
        )}
      </form>
    </Modal>
  )
}
