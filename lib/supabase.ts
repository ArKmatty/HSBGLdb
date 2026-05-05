import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.'
  );
}

// Client-safe anon key client — use in Server/Client components for user-facing queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only service role client — bypasses RLS, use ONLY in server actions, API routes, and cron jobs
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (() => {
      console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY is missing. supabaseAdmin falls back to the anon client (RLS-protected). Server-only operations will fail.');
      return supabase;
    })();
