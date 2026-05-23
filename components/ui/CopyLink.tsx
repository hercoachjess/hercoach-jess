'use client'

import { useState } from 'react'

interface CopyLinkProps {
  url: string
  label: string
  hint?: string
}

export default function CopyLink({ url, label, hint }: CopyLinkProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="bg-[#141414] border border-[rgba(255,255,255,0.14)] rounded-sm p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[#b8b4ac] tracking-widest uppercase font-medium">{label}</span>
        <button
          onClick={handleCopy}
          className={`text-xs px-3 py-1.5 border rounded-sm transition-all whitespace-nowrap font-medium ${
            copied
              ? 'border-[rgba(125,168,125,0.5)] text-[#7da87d] bg-[rgba(125,168,125,0.1)]'
              : 'border-[rgba(255,255,255,0.24)] text-[#f0ece4] hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.04)]'
          }`}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M2 8V2a1 1 0 011-1h6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Copy link
            </span>
          )}
        </button>
      </div>
      <code className="text-xs text-[#e0d8cc] font-mono break-all bg-[#0a0a0a] rounded px-2 py-1.5 border border-[rgba(255,255,255,0.08)]">
        {url}
      </code>
      {hint && <p className="text-xs text-[#a8a49c] leading-relaxed">{hint}</p>}
    </div>
  )
}
