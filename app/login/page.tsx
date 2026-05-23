'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#080808' }}
    >
      <div className="w-full max-w-sm fade-in">
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        <div
          className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-sm p-8"
        >
          <h1
            className="text-lg font-normal mb-6"
            style={{ color: 'rgba(240,236,228,0.6)', fontFamily: 'var(--font-jost)' }}
          >
            Coach sign in
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-underline"
                placeholder="jess@hercoach.co.uk"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-underline"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-[#b06060]">{error}</p>
            )}

            <Button type="submit" loading={loading} className="mt-2 w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'rgba(240,236,228,0.2)' }}
        >
          This system is for authorised coach access only.
        </p>
      </div>
    </div>
  )
}
