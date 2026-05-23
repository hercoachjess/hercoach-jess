import { createClient } from '@supabase/supabase-js'

// Service-role client — ONLY for server-side API routes
// Never import this in browser/client code
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
