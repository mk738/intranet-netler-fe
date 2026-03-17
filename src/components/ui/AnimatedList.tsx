import { ReactNode } from 'react'
import { motion } from 'framer-motion'

const prefersReduced =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: prefersReduced ? 0 : 0.04,
    },
  },
}

export const itemVariants = {
  hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
  show:   { opacity: 1, y: 0, transition: { duration: prefersReduced ? 0 : 0.15 } },
}

interface Props {
  children:   ReactNode
  className?: string
}

export function AnimatedList({ children, className }: Props) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedListItem({ children, className }: Props) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
