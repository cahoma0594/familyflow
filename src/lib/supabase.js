import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', url)

if (!url || !key) {
  console.error('⚠️  Faltan variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(url, key)
