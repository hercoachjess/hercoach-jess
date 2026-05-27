'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** 'lg' (default ~32rem) for short modals, 'xl' (~42rem) for long form modals */
  size?: 'lg' | 'xl'
}

export default function Modal({ open, onClose, title, children, footer, size = 'lg' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const widthClass = size === 'xl' ? 'sm:max-w-2xl' : 'sm:max-w-lg'

  // Layout: fixed full-screen container, modal panel uses flex column with
  // its own max-height so the body becomes the only scrollable area while
  // the header (title + close) and footer (Cancel / Save) stay anchored.
  // This is what was breaking on phones — previously the panel could exceed
  // viewport height and the save button became unreachable.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${widthClass} bg-[#0e0e0e] border border-[rgba(255,255,255,0.12)] rounded-sm shadow-2xl flex flex-col`}
        style={{
          maxHeight: 'calc(100dvh - 1.5rem)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header — fixed at top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[rgba(255,255,255,0.24)] flex-shrink-0">
          <h3 className="text-base font-medium text-[#f0ece4]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#b8b4ac] hover:text-[#f0ece4] transition-colors -m-2 p-2"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        {/* Body — the only scrollable region. WebkitOverflowScrolling for iOS momentum. */}
        <div
          className="px-5 sm:px-6 py-5 overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-[rgba(255,255,255,0.24)] flex gap-3 justify-end flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
