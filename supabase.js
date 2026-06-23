import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msfdviohxnbilvzcwezl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZmR2aW9oeG5iaWx2emN3ZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Njg0NzQsImV4cCI6MjA5NzU0NDQ3NH0.fTRbUbyA99_ZfvF7xf8vnssF-GwwjfiE2QO-uE0PW6g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
