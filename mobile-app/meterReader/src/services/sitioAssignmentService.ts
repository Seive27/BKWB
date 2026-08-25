import { supabase } from '@/lib/supabase';

/**
 * The sitios officially assigned to the signed-in meter reader
 * (sitio_assignments rows). RLS limits reads to the caller's own rows.
 */
export async function getMySitioAssignments(): Promise<
  { id: string; sitio: string }[]
> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to view your sitio assignments.');
  }

  const { data, error } = await supabase
    .from('sitio_assignments')
    .select('id, sitio')
    .eq('meter_reader_id', session.user.id)
    .order('sitio', { ascending: true });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation')) {
      // Assignments table not migrated yet — degrade to no official coverage.
      console.warn('[sitio-assignments] table not available:', error.message);
      return [];
    }
    throw new Error(error.message || 'Failed to load your sitio assignments.');
  }

  return (data ?? []) as { id: string; sitio: string }[];
}
