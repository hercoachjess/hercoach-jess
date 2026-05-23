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
    <header className="border-b border-[rgba(255,255,255,0.07)] px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-[#080808]">
      <Link href="/dashboard">
        <Logo size="sm" />
      </Link>
      <button
        onClick={handleSignOut}
        className="text-xs text-[#6b6764] hover:text-[#c8c4bc] transition-colors tracking-wider uppercase"
      >
        Sign out
      </button>
    </header>
  )
}
