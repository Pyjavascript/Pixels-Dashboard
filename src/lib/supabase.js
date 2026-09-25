import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to upload files to Supabase Storage bucket 'project-assets'
 */
export async function uploadDeliverableFile(file, projectId) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${projectId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("project-assets")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function uploadRequestAttachment(file, projectId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('requests-media')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('requests-media')
    .getPublicUrl(fileName);

  return data.publicUrl;
}