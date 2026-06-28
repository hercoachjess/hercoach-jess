import { createClient } from '@supabase/supabase-js'

// Service-role client, ONLY for server-side API routes.
// Never import this in browser/client code.
//
// Throws a clear, named error if either required env var is missing.
// The calling route catches this and surfaces it (so Vercel function logs
// and the JSON response can tell us exactly which var to set).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set in this environment. Set it in Vercel → Settings → Environment Variables, then redeploy.'
    )
  }
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set in this environment. Copy the service-role key from Supabase Dashboard → Project Settings → API Keys, add it to Vercel → Settings → Environment Variables (Production), then redeploy.'
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
