import { createClient } from '@/lib/supabase/server';

import type { Database } from '@/types/database';

export type ProjectDocument = Database['public']['Tables']['documents']['Row'];
export type CreateProjectDocumentInput = Database['public']['Tables']['documents']['Insert'];
export type UpdateProjectDocumentInput = Database['public']['Tables']['documents']['Update'];

export async function listByProject(projectId: string): Promise<ProjectDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getById(id: string): Promise<ProjectDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function create(input: CreateProjectDocumentInput): Promise<ProjectDocument> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('documents').insert(input).select().single();

  if (error) throw error;
  return data;
}

export async function update(
  id: string,
  input: UpdateProjectDocumentInput,
): Promise<ProjectDocument> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('documents')
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
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
