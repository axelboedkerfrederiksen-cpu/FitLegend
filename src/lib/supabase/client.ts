import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

// Singleton — one browser client for the entire app.
// Multiple instances race over the same auth cookies and can stall each other.
let instance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (instance) return instance
  instance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return instance
}
