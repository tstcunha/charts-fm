import { put, del } from '@vercel/blob'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export interface UploadResult {
  url: string
}

/**
 * Storage abstraction that supports both local filesystem (development) 
 * and Vercel Blob (production)
 */
export async function uploadFile(
  fileName: string,
  file: File | Buffer,
  contentType: string,
  folder: 'profile-pictures' | 'group-pictures' | 'artist-images' = 'profile-pictures'
): Promise<UploadResult> {
  // Check if we should use local storage
  const useLocalStorage = 
    process.env.STORAGE_TYPE === 'local' ||
    (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== 'production')

  if (useLocalStorage) {
    return uploadToLocal(fileName, file, contentType, folder)
  } else {
    return uploadToBlob(fileName, file, contentType, folder)
  }
}

/**
 * Upload to local filesystem (for development)
 */
async function uploadToLocal(
  fileName: string,
  file: File | Buffer,
  contentType: string,
  folder: 'profile-pictures' | 'group-pictures' | 'artist-images' = 'profile-pictures'
): Promise<UploadResult> {
  const uploadsDir = join(process.cwd(), 'public', 'uploads', folder)
  
  // Ensure base directory exists
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  const filePath = join(uploadsDir, fileName)
  const lastSlashIndex = filePath.lastIndexOf('/')
  const fileDir = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : uploadsDir
  
  // Ensure subdirectory exists (for user/group-specific folders)
  if (fileDir !== uploadsDir && !existsSync(fileDir)) {
    await mkdir(fileDir, { recursive: true })
  }

  // Convert File to Buffer if needed
  const buffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file

  // Write file to disk
  await writeFile(filePath, buffer)

  // Return public URL (Next.js serves files from /public)
  const url = `/uploads/${folder}/${fileName}`
  
  return { url }
}

/**
 * Upload to Vercel Blob (for production)
 */
async function uploadToBlob(
  fileName: string,
  file: File | Buffer,
  contentType: string,
  folder: 'profile-pictures' | 'group-pictures' | 'artist-images' = 'profile-pictures'
): Promise<UploadResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for blob storage')
  }

  // Use the same path structure for blob storage
  const blobFileName = `${folder}/${fileName}`
  
  // Convert File to ArrayBuffer if needed, otherwise use Buffer as-is
  let body: ArrayBuffer | Buffer
  if (file instanceof File) {
    body = await file.arrayBuffer()
  } else {
    body = file
  }
  
  const blob = await put(blobFileName, body as any, {
    access: 'public',
    contentType,
  })

  return { url: blob.url }
}

/**
 * Delete a file from storage based on its URL
 * Supports both local filesystem and Vercel Blob
 */
export async function deleteFile(
  fileUrl: string,
  folder?: 'profile-pictures' | 'group-pictures' | 'artist-images'
): Promise<void> {
  // Auto-detect folder from URL if not provided
  if (!folder) {
    if (fileUrl.includes('/uploads/group-pictures/') || 
        (fileUrl.includes('blob.vercel-storage.com') && fileUrl.includes('group-pictures'))) {
      folder = 'group-pictures'
    } else if (fileUrl.includes('/uploads/artist-images/') || 
        (fileUrl.includes('blob.vercel-storage.com') && fileUrl.includes('artist-images'))) {
      folder = 'artist-images'
    } else {
      folder = 'profile-pictures'
    }
  }

  // Check if we should use local storage
  const useLocalStorage = 
    process.env.STORAGE_TYPE === 'local' ||
    (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== 'production')

  if (useLocalStorage) {
    await deleteFromLocal(fileUrl, folder)
  } else {
    await deleteFromBlob(fileUrl)
  }
}

/**
 * Delete from local filesystem
 */
async function deleteFromLocal(
  fileUrl: string,
  folder: 'profile-pictures' | 'group-pictures' | 'artist-images' = 'profile-pictures'
): Promise<void> {
  // Extract file path from URL (e.g., /uploads/profile-pictures/userId/filename.jpg)
  const expectedPrefix = `/uploads/${folder}/`
  if (!fileUrl.startsWith(expectedPrefix)) {
    // Not a local file, might be external URL - skip deletion
    console.warn(`Skipping deletion of non-local file: ${fileUrl}`)
    return
  }

  const fileName = fileUrl.replace(expectedPrefix, '')
  const filePath = join(process.cwd(), 'public', 'uploads', folder, fileName)

  if (existsSync(filePath)) {
    await unlink(filePath)
  } else {
    console.warn(`File not found for deletion: ${filePath}`)
  }
}

/**
 * Delete from Vercel Blob
 */
async function deleteFromBlob(fileUrl: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for blob storage')
  }

  try {
    // Check if it's a Vercel Blob URL
    if (fileUrl.includes('blob.vercel-storage.com')) {
      // The del function can accept the full URL directly
      await del(fileUrl)
    } else {
      // Not a blob URL - might be an external URL that was manually set
      console.warn(`Skipping deletion of non-blob URL: ${fileUrl}`)
    }
  } catch (error) {
    // Log error but don't throw - we still want to remove the URL from database
    console.error(`Failed to delete blob: ${fileUrl}`, error)
    // Don't throw - allow the database update to proceed
  }
}

