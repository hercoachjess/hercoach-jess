'use client'

import { useEffect, useState } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** 'lg' (~32rem) for short modals, 'xl' (~42rem) for long form modals */
  size?: 'lg' | 'xl'
}

/**
 * iOS-native bottom sheet on mobile, centered modal on desktop.
 *
 * The mobile layout sidesteps every iOS Safari quirk that broke the old
 * centred-modal approach:
 *   - panel is anchored to the bottom edge so the visible region is always
 *     the same as the visual viewport, regardless of how Safari is
 *     measuring layout height
 *   - we sync max-height to window.visualViewport.height so the panel
 *     shrinks to fit ABOVE the on-screen keyboard rather than disappearing
 *     under it — works on iOS 13+ (broader than the 100dvh approach)
 *   - the body is the only overflow-y region, with momentum scroll and
 *     overscroll-contain to stop iOS rubber-band leaking to the page
 *   - footer sits inside the flex column with safe-area-inset padding so
 *     the Save button always clears the home indicator
 *   - background page scroll locks while open
 */
export default function Modal({ open, onClose, title, children, footer, size = 'lg' }: ModalProps) {
  // Maximum panel height in pixels. We seed with the layout viewport so we
  // never produce 0 (which would hide everything) and then sync to the
  // visual viewport — which shrinks when the keyboard appears.
  const [maxPanelHeight, setMaxPanelHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function update() {
      const vv = window.visualViewport
      const h = vv ? vv.height : window.innerHeight
      setMaxPanelHeight(h)
    }

    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      document.body.style.overflow = previousOverflow
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [open])

  if (!open) return null

  const desktopWidth = size === 'xl' ? 'sm:max-w-2xl' : 'sm:max-w-lg'

  // Mobile: anchored bottom sheet filling up to the visual viewport.
  // Desktop: centred panel via translate trick, capped at 90vh.
  const panelClass = [
    'fixed z-10 bg-[#0e0e0e] border border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col',
    'left-0 right-0 bottom-0 w-full rounded-t-2xl',
    `sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sm sm:w-full ${desktopWidth}`,
  ].join(' ')

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={panelClass}
        style={{
          maxHeight: maxPanelHeight ? `${maxPanelHeight}px` : '100dvh',
        }}
      >
        {/* Mobile-only drag handle — visual cue that this is a sheet */}
        <div className="sm:hidden pt-2 pb-1 flex-shrink-0">
          <div className="mx-auto w-10 h-1 rounded-full bg-[rgba(255,255,255,0.18)]" />
        </div>

        {/* Header — fixed at top of panel */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-[rgba(255,255,255,0.24)] flex-shrink-0">
          <h3 className="text-base font-medium text-[#f0ece4]">{title}</h3>
          <button
            onClick={onClose}
            className="-m-2 p-2 text-[#b8b4ac] hover:text-[#f0ece4] transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        {/* Body — the only scrollable region */}
        <div
          className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>

        {/* Footer — always reachable above keyboard + home indicator */}
        {footer && (
          <div
            className="px-5 sm:px-6 py-3 sm:py-4 border-t border-[rgba(255,255,255,0.24)] flex gap-3 justify-end flex-shrink-0 bg-[#0e0e0e]"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
