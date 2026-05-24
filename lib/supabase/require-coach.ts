import { NextResponse } from 'next/server'
import { createClient } from './server'

// Guard for server-only routes that should only be callable by the
// authenticated coach. Call from inside an API route:
//
//   const unauthorized = await requireCoach()
//   if (unauthorized) return unauthorized
//
// Returns null on success, or a 401 NextResponse on failure.
export async function requireCoach(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  return null
}
