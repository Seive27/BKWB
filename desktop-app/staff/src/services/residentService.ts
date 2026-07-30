import type { Resident } from '../types';

// TODO: Implement with Supabase queries
export async function getResidents(): Promise<Resident[]> {
  // const { data } = await supabase.from('residents').select('*');
  // return data ?? [];
  return [];
}

export async function getResidentById(_id: string): Promise<Resident | null> {
  // const { data } = await supabase.from('residents').select('*').eq('id', id).single();
  // return data;
  return null;
}

export async function createResident(_resident: Omit<Resident, 'id'>): Promise<Resident | null> {
  // const { data } = await supabase.from('residents').insert(resident).select().single();
  // return data;
  return null;
}

export async function updateResident(_id: string, _updates: Partial<Resident>): Promise<void> {
  // await supabase.from('residents').update(updates).eq('id', id);
}

export async function deleteResident(_id: string): Promise<void> {
  // await supabase.from('residents').delete().eq('id', id);
}
