'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function DashboardNav() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b border-[rgba(255,255,255,0.24)] px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-[#080808]">
      <Link href="/dashboard">
        <Logo size="sm" />
      </Link>
      <div className="flex items-center gap-5">
        <Link
          href="/dashboard/settings"
          className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] transition-colors tracking-wider uppercase"
        >
          AI Style
        </Link>
        <button
          onClick={handleSignOut}
          className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] transition-colors tracking-wider uppercase"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
