import { ReactNode } from 'react'
import { motion } from 'framer-motion'

const prefersReduced =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

interface Props {
  children: ReactNode
}

export function PageTransition({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReduced ? 0 : 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
