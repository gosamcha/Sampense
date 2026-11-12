import { createClient } from '@supabase/supabase-js'

const env = (import.meta as ImportMeta & { env: Record<string, string> }).env
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key && key.startsWith('sb_publishable_')
  ? createClient(url, key) : null
export function client() {
  if (!supabase) throw new Error('VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 설정해 주세요.')
  return supabase
}
