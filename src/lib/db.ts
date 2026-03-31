import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Submission {
  id?: number;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  notes: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Availability {
  id?: number;
  submission_id?: number;
  day: string;
  time_slot: string;
}

export interface ChildData extends Submission {
  availability: Availability[];
}

export async function saveChildData(data: ChildData) {
  // Invalidate existing active submissions for the exact same child name
  await supabase
    .from('submissions')
    .update({ active: false })
    .ilike('child_name', data.child_name);

  // Insert new submission
  const { data: subData, error: subError } = await supabase
    .from('submissions')
    .insert({
      parent_name: data.parent_name,
      parent_phone: data.parent_phone,
      parent_email: data.parent_email,
      child_name: data.child_name,
      child_age: data.child_age,
      notes: data.notes || '',
      active: true,
    })
    .select()
    .single();

  if (subError) throw subError;

  const submission_id = subData.id;

  const availabilityToInsert = data.availability
    .filter(slot => slot.day !== 'Not available')
    .map(slot => ({
      submission_id,
      day: slot.day,
      time_slot: slot.time_slot
    }));

  if (availabilityToInsert.length > 0) {
    const { error: availError } = await supabase
      .from('availability')
      .insert(availabilityToInsert);
    if (availError) throw availError;
  }

  return submission_id;
}

export async function updateChildData(data: ChildData) {
  if (!data.id) throw new Error('ID required for update');

  const { error: subError } = await supabase
    .from('submissions')
    .update({
      parent_name: data.parent_name,
      parent_phone: data.parent_phone,
      parent_email: data.parent_email,
      child_name: data.child_name,
      child_age: data.child_age,
      notes: data.notes || '',
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  if (subError) throw subError;

  const { error: delError } = await supabase
    .from('availability')
    .delete()
    .eq('submission_id', data.id);
  
  if (delError) throw delError;

  const availabilityToInsert = data.availability
    .filter(slot => slot.day !== 'Not available')
    .map(slot => ({
      submission_id: data.id,
      day: slot.day,
      time_slot: slot.time_slot
    }));

  if (availabilityToInsert.length > 0) {
    const { error: availError } = await supabase
      .from('availability')
      .insert(availabilityToInsert);
    if (availError) throw availError;
  }

  return data.id;
}

export async function getAllActiveData(): Promise<ChildData[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      availability (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ChildData[];
}

export async function getSubmissionById(id: number): Promise<Submission | undefined> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;
  return data as Submission;
}

export async function getAvailabilityBySubmissionId(id: number): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('submission_id', id);

  if (error || !data) return [];
  return data as Availability[];
}

export async function deactivateSubmission(id: number) {
  const { error } = await supabase
    .from('submissions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export default supabase;
