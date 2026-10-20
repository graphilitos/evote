/**
 * Supabase server-side client menggunakan SERVICE_ROLE_KEY.
 * PENTING: Key ini HANYA boleh digunakan di server (API routes, Server Components).
 * JANGAN gunakan di client-side / komponen browser.
 * Service role bypass RLS — akses penuh ke database.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Variabel NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local'
    );
  }

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Nonaktifkan auto-refresh token — tidak diperlukan untuk service role
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

// Proxy agar pemanggilan tetap sederhana: supabase.from(...) dll
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

