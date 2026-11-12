import { createClient } from '@supabase/supabase-js'

const env = (import.meta as ImportMeta & { env: Record<string, string> }).env
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key && key.startsWith('sb_publishable_')
  ? createClient(url, key) : null
export function client() {
  if (!supabase) throw new Error('Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}
