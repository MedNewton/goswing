import { supabase } from '@/lib/supabase';

export async function smokeTestEvents(): Promise<number> {
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('status', 'published')
    .limit(5);

  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
