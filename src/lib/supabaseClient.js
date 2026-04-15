import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Support both common names: VITE_SUPABASE_ANON_KEY (recommended) and VITE_SUPABASE_PUBLISHABLE_KEY
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Provide a clearer error message to help the developer configure env vars correctly
  const err = new Error(
	'Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your .env or environment.'
  )
  // eslint-disable-next-line no-console
  console.error(err.message)
  throw err
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

