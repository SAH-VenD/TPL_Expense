interface FileSignature {
  mimeTypes: string[];
  magic: number[];
  offset: number;
}

const FILE_SIGNATURES: FileSignature[] = [
  {
    mimeTypes: ['image/jpeg', 'image/jpg'],
    magic: [0xff, 0xd8, 0xff],
    offset: 0,
  },
  {
    mimeTypes: ['image/png'],
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    offset: 0,
  },
  {
    mimeTypes: ['application/pdf'],
    magic: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
  },
  {
    mimeTypes: ['image/heic', 'image/heif'],
    magic: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
  },
];

function matchesSignature(buffer: Buffer, signature: FileSignature): boolean {
  const { magic, offset } = signature;

  if (buffer.length < offset + magic.length) {
    return false;
  }

  return magic.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Detects the file type from the buffer's magic bytes.
 * Returns the primary MIME type string, or null if unrecognized.
 */
export function getFileTypeFromSignature(buffer: Buffer): string | null {
  for (const signature of FILE_SIGNATURES) {
    if (matchesSignature(buffer, signature)) {
      return signature.mimeTypes[0];
    }
  }

  return null;
}

/**
 * Validates that a buffer's magic bytes match the declared MIME type.
 * Returns true when the detected signature includes the declared type,
 * or when the buffer signature is unrecognized (to avoid blocking unknown formats).
 */
export function validateFileSignature(buffer: Buffer, declaredMimeType: string): boolean {
  const normalizedMime = declaredMimeType.toLowerCase().trim();

  for (const signature of FILE_SIGNATURES) {
    if (signature.mimeTypes.includes(normalizedMime)) {
      return matchesSignature(buffer, signature);
    }
  }

  // Unknown declared type - allow through (validation only applies to known types)
  return true;
}
