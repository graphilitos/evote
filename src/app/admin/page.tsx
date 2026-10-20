/**
 * Dashboard admin — ringkasan status pemilihan.
 * Server Component, cek sesi di sini.
 */
import { redirect } from 'next/navigation';
import { getAdminSessionFromCookies } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import AdminDashboardClient from './AdminDashboardClient';

// Di-render dinamis karena bergantung pada cookies dan data DB

export default async function AdminDashboardPage() {
  const session = await getAdminSessionFromCookies();
  if (!session) redirect('/admin/login');

  // Ambil data server-side
  const [settingsRes, tokenRes, voteRes] = await Promise.all([
    supabase.from('election_settings').select('*').eq('id', 1).single(),
    supabase.from('tokens').select('*', { count: 'exact', head: true }),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
  ]);

  const { count: usedCount } = await supabase
    .from('tokens')
    .select('*', { count: 'exact', head: true })
    .eq('used', true);

  return (
    <AdminDashboardClient
      settings={settingsRes.data}
      totalTokens={tokenRes.count ?? 0}
      usedTokens={usedCount ?? 0}
      totalVotes={voteRes.count ?? 0}
    />
  );
}
