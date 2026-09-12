import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

export interface UploadResult {
  filePath: string;
  fileName: string;
  url: string;
}

/**
 * Ensures that the uploads directory exists
 */
async function ensureUploadDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Generates a unique filename for uploaded files
 */
function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const safeName = path.basename(originalName, ext)
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  
  return `${safeName}-${timestamp}-${randomString}${ext}`;
}

/**
 * Uploads a file to the server
 * 
 * @param fileBuffer The binary data of the file
 * @param originalFilename The original filename
 * @param uploadType The type of upload (logos, favicons, etc.)
 * @returns Information about the uploaded file
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalFilename: string,
  uploadType: 'logos' | 'favicons' | 'backgrounds' = 'logos'
): Promise<UploadResult> {
  // Define the upload directory
  const uploadDir = path.join('public', 'uploads', uploadType);
  
  // Ensure the upload directory exists
  await ensureUploadDir(uploadDir);
  
  // Generate a unique filename
  const fileName = generateUniqueFileName(originalFilename);
  
  // Define the path where the file will be saved
  const filePath = path.join(uploadDir, fileName);
  
  // Save the file
  await writeFile(filePath, fileBuffer);
  
  // Return the file information
  return {
    filePath,
    fileName,
    url: `/uploads/${uploadType}/${fileName}`
  };
}