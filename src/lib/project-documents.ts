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

/** Atomically saves under RLS, returning null for stale or unavailable documents. */
export async function updateContentAtRevision(
  id: string,
  content: string,
  expectedRevision: number,
): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_document_revision', {
    p_document_id: id,
    p_content: content,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;
  return data?.[0]?.revision ?? null;
}
