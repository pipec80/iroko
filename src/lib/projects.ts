import { createClient } from '@/lib/supabase/server';

import type { Database } from '@/types/database';

export type Project = Database['public']['Tables']['projects']['Row'];

export type CreateProjectInput = Database['public']['Tables']['projects']['Insert'];

export async function listByAccount(accountId: string): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBySlug(accountId: string, slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('account_id', accountId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(input: CreateProjectInput): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('projects').insert(input).select().single();

  if (error) throw error;
  return data;
}
