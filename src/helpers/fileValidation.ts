import { allowedFileExtensions, maxFileSizeBytes } from "../constants";

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  file?: File;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.'));
}

/**
 * Format file size for human reading
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
): FileValidationResult {
  const maxSizeBytes = maxFileSizeBytes;
  const allowedExtensions = allowedFileExtensions;

  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File "${file.name}" is too large (max ${formatFileSize(maxSizeBytes)})`
    };
  }
  
  // Check file extension
  if (allowedExtensions.length > 0) {
    const fileExtension = getFileExtension(file.name);
    if (!allowedExtensions.some(ext => ext.toLowerCase() === fileExtension.toLowerCase())) {
      return {
        isValid: false,
        error: `File "${file.name}" has an unsupported extension. Allowed extensions: ${allowedExtensions.join(', ')}`
      };
    }
  }
  
  return {
    isValid: true,
    file
  };
}
