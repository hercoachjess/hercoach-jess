import { forwardRef } from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
}

export default function Card({ children, className = '', elevated }: CardProps) {
  const bg = elevated ? 'bg-[#141414]' : 'bg-[#0e0e0e]'
  return (
    <div className={`${bg} border border-[rgba(255,255,255,0.07)] rounded-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 border-b border-[rgba(255,255,255,0.07)] ${className}`}>
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '' }, ref) => (
    <div ref={ref} className={`px-5 py-4 ${className}`}>
      {children}
    </div>
  )
)

CardBody.displayName = 'CardBody'
