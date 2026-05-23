'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, disabled, className = '', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

    const variants = {
      primary:
        'bg-[#f0ece4] text-[#080808] hover:bg-[#e8e0d4] border border-[#f0ece4]',
      outline:
        'bg-transparent text-[#f0ece4] border border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)]',
      ghost:
        'bg-transparent text-[#e0d8cc] hover:text-[#f0ece4] border border-transparent hover:border-[rgba(255,255,255,0.1)]',
      danger:
        'bg-transparent text-[#b06060] border border-[rgba(176,96,96,0.3)] hover:border-[rgba(176,96,96,0.6)]',
    }

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
