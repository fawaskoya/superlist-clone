import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import sharp from 'sharp';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. File storage will use local disk.');
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export class SupabaseStorage {
  private bucket = 'taskflow-files';

  async initializeBucket() {
    if (!supabase) {
      console.warn('Supabase not configured, skipping bucket initialization');
      return false;
    }

    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucket);

      if (!bucketExists) {
        // Create bucket with public access
        const { error } = await supabase.storage.createBucket(this.bucket, {
          public: true,
          allowedMimeTypes: ['image/*', 'audio/*', 'application/pdf', 'text/*', 'application/*'],
          fileSizeLimit: 25 * 1024 * 1024, // 25MB
        });

        if (error) {
          console.error('Failed to create Supabase bucket:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error initializing Supabase bucket:', error);
      return false;
    }
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    taskId: string,
    userId: string
  ): Promise<{ url: string; thumbnailUrl?: string } | null> {
    if (!supabase) {
      console.warn('Supabase not configured, cannot upload file');
      return null;
    }

    try {
      // Generate unique file path
      const fileExt = path.extname(fileName);
      const baseName = path.basename(fileName, fileExt);
      const uniqueFileName = `${taskId}/${userId}/${Date.now()}-${baseName}${fileExt}`;

      // Upload original file
      const { error: uploadError } = await supabase.storage
        .from(this.bucket)
        .upload(uniqueFileName, createReadStream(filePath), {
          contentType: mimeType,
          duplex: 'half'
        });

      if (uploadError) {
        console.error('Error uploading to Supabase:', uploadError);
        return null;
      }

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (mimeType.startsWith('image/') && mimeType !== 'image/gif') {
        thumbnailUrl = await this.generateThumbnail(filePath, uniqueFileName);
      }

      // Get public URL
      const { data } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(uniqueFileName);

      return {
        url: data.publicUrl,
        thumbnailUrl
      };
    } catch (error) {
      console.error('Error in Supabase upload:', error);
      return null;
    }
  }

  private async generateThumbnail(
    originalPath: string,
    originalFileName: string
  ): Promise<string | undefined> {
    try {
      const thumbnailFileName = `thumbnails/${originalFileName}`;

      // Generate 200x200 thumbnail
      await sharp(originalPath)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer()
        .then(async (buffer) => {
          const { error } = await supabase.storage
            .from(this.bucket)
            .upload(thumbnailFileName, buffer, {
              contentType: 'image/jpeg',
            });

          if (error) {
            console.error('Error uploading thumbnail:', error);
            return null;
          }
        });

      const { data } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(thumbnailFileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return undefined;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured, cannot delete file');
      return false;
    }

    try {
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting from Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in Supabase delete:', error);
      return false;
    }
  }
}

export const supabaseStorage = new SupabaseStorage();
