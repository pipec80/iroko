import { createClient } from '@/lib/supabase/server';

import type { Database } from '@/types/database';

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectStatus = Database['public']['Enums']['project_status'];

export type CreateProjectInput = Database['public']['Tables']['projects']['Insert'];
export type UpdateProjectInput = Database['public']['Tables']['projects']['Update'];

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

export async function update(id: string, input: UpdateProjectInput): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archive(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
