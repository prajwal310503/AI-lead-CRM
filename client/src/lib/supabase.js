import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(new DOMException('Connection timed out', 'AbortError')), 12000)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: { fetch: fetchWithTimeout },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export default supabase
