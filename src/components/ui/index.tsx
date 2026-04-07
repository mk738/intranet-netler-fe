import { ReactNode, ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

const prefersReduced =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?:    'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary'   && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'danger'    && 'btn-danger',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {loading && (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: prefersReduced ? 0 : 0.1 }}
          >
            <Spinner size="sm" />
          </motion.span>
        )}
      </AnimatePresence>
      <motion.span
        animate={{ x: loading ? 4 : 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.1 }}
      >
        {children}
      </motion.span>
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'active' | 'pending' | 'unplaced' | 'prospect' | 'ended'

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`badge-${variant}`}>{children}</span>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-8 h-8' }[size]
  return (
    <svg
      className={clsx(sz, 'animate-spin text-purple-light')}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

// ── EmptyState ────────────────────────────────────────────────
export function EmptyState({ title, description, action }: {
  title:        string
  description?: string
  action?:      ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-purple-bg border border-purple/20 flex items-center justify-center mb-4">
        <span className="text-purple-light text-xl">·</span>
      </div>
      <p className="text-sm font-medium text-text-1 mb-1">{title}</p>
      {description && <p className="text-xs text-text-3 mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer, disableBackdropClose = false }: {
  title:                string
  onClose:              () => void
  children:             ReactNode
  footer?:              ReactNode
  disableBackdropClose?: boolean
}) {
  return createPortal(
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 px-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReduced ? 0 : 0.15 }}
      onClick={!disableBackdropClose ? onClose : undefined}
    >
      <motion.div
        className="bg-bg-card border border-mild rounded-xl w-full max-w-lg shadow-modal"
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <h2 className="text-sm font-semibold text-text-1">{title}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded bg-bg-hover text-text-2 hover:text-text-1 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-subtle flex justify-end gap-2">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ title, children, className }: {
  title?:    string
  children:  ReactNode
  className?: string
}) {
  return (
    <div className={clsx('card', className)}>
      {title && (
        <p className="section-label mb-3">{title}</p>
      )}
      {children}
    </div>
  )
}
