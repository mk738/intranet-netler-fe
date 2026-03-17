import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error'

interface ToastState {
  id:      number
  message: string
  variant: ToastVariant
}

// ── Toast item ────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: ToastState; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const variantClass = toast.variant === 'success'
    ? 'bg-success-bg border border-success/20 text-success'
    : 'bg-danger-bg border border-danger/20 text-danger'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`px-4 py-3 rounded-lg text-sm shadow-modal ${variantClass}`}
    >
      {toast.message}
    </motion.div>
  )
}

// ── Container ─────────────────────────────────────────────────

let _showToast: ((message: string, variant: ToastVariant) => void) | null = null

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([])
  let counter = 0

  const show = useCallback((message: string, variant: ToastVariant) => {
    const id = ++counter
    setToasts(prev => [...prev, { id, message, variant }])
  }, []) // eslint-disable-line

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    _showToast = show
    return () => { _showToast = null }
  }, [show])

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

// ── Hook ──────────────────────────────────────────────────────

export function useToast() {
  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    _showToast?.(message, variant)
  }, [])

  return { showToast }
}
