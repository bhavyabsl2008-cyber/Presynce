export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateChalkpadScreenshot(file: File): FileValidationResult {
  // Client validation is NOT a security boundary.
  // Production upload processing must eventually perform server-side:
  // - byte/signature verification
  // - server size enforcement
  // - generated filenames
  // - authentication/authorization
  // - rate limiting
  // - isolated image decoding/processing
  // - no trust in MIME/filename metadata supplied by the browser

  if (!file || file.size === 0) {
    return { valid: false, error: "File is empty or missing." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File size exceeds 10 MB limit." };
  }

  const validMimeTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!validMimeTypes.includes(file.type)) {
    return { valid: false, error: "Only PNG, JPG, and WebP images are supported." };
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg") && !name.endsWith(".webp")) {
    return { valid: false, error: "File must have a .png, .jpg, .jpeg, or .webp extension." };
  }

  return { valid: true };
}
