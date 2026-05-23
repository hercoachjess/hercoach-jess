'use client'

import { useEffect } from 'react'
import Button from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-[#0e0e0e] border border-[rgba(255,255,255,0.12)] rounded-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.24)]">
          <h3 className="text-base font-medium text-[#f0ece4]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#b8b4ac] hover:text-[#f0ece4] transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.24)] flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
