interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'active' | 'paused' | 'archived' | 'paid' | 'pending' | 'overdue' | 'draft' | 'saved'
  dot?: boolean
  className?: string
}

const variants: Record<string, string> = {
  default:   'bg-[rgba(255,255,255,0.06)] text-[#c8c4bc]',
  active:    'bg-[rgba(125,168,125,0.12)] text-[#7da87d]',
  paused:    'bg-[rgba(255,255,255,0.06)] text-[#6b6764]',
  archived:  'bg-[rgba(255,255,255,0.04)] text-[#4a4744]',
  paid:      'bg-[rgba(125,168,125,0.12)] text-[#7da87d]',
  pending:   'bg-[rgba(255,255,255,0.06)] text-[#a8a49c]',
  overdue:   'bg-[rgba(200,154,106,0.15)] text-[#c89a6a]',
  draft:     'bg-[rgba(255,255,255,0.06)] text-[#a8a49c]',
  saved:     'bg-[rgba(125,168,125,0.12)] text-[#7da87d]',
}

export default function Badge({ children, variant = 'default', dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-sm ${variants[variant] ?? variants.default} ${className}`}
    >
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: variant === 'overdue' ? '#c89a6a'
              : variant === 'paid' || variant === 'active' || variant === 'saved' ? '#7da87d'
              : '#6b6764',
          }}
        />
      )}
      {children}
    </span>
  )
}
