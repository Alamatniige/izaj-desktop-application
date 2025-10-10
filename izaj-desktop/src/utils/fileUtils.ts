export const createPreviewUrls = (files: File[]): string[] => {
  return files.map(file => URL.createObjectURL(file));
};

export const revokePreviewUrls = (urls: string[]): void => {
  urls.forEach(url => URL.revokeObjectURL(url));
};

export const validateFiles = (files: File[]): { valid: boolean; message?: string } => {
  if (files.length === 0) {
    return { valid: false, message: 'Please select at least one file' };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  const invalidFiles = files.filter(file => file.size > maxSize);
  
  if (invalidFiles.length > 0) {
    return { valid: false, message: 'Some files exceed 10MB limit' };
  }

  return { valid: true };
};