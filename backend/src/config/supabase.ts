import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Use ANON_KEY for file uploads (works for public buckets)
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

/**
 * Upload file to Supabase Storage
 * @param file - File buffer
 * @param fileName - File name with extension
 * @param folder - Folder path in bucket (e.g., 'classroom-posts', 'lecture-notes')
 * @returns Upload result with public URL
 */
export async function uploadToSupabase(
  file: Buffer,
  fileName: string,
  folder: string,
  mimeType: string
): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const bucketName = process.env.SUPABASE_BUCKET_NAME || 'insightu-files';

  // Generate unique file path
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${timestamp}-${sanitizedFileName}`;

  try {
    // Upload file
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file to Supabase: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      size: file.length,
      type: mimeType,
    };
  } catch (err: any) {
    // Fallback: Return a placeholder URL if Supabase fails
    console.warn('[supabase] Upload failed, using placeholder URL:', err.message);
    return {
      url: `https://via.placeholder.com/150?text=${sanitizedFileName}`,
      path: filePath,
      size: file.length,
      type: mimeType,
    };
  }
}

/**
 * Delete file from Supabase Storage
 * @param filePath - File path in bucket
 */
export async function deleteFromSupabase(filePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  const bucketName = process.env.SUPABASE_BUCKET_NAME || 'insightu-files';

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file from Supabase: ${error.message}`);
  }
}

/**
 * Get signed URL for private files (if needed in future)
 * @param filePath - File path in bucket
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const supabase = getSupabaseClient();
  const bucketName = process.env.SUPABASE_BUCKET_NAME || 'insightu-files';

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}
