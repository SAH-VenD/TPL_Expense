import { validateFileSignature, getFileTypeFromSignature } from './file-validation';

describe('file-validation', () => {
  function buildBuffer(magicBytes: number[], paddingLength = 64): Buffer {
    const padding = Buffer.alloc(paddingLength);
    return Buffer.concat([Buffer.from(magicBytes), padding]);
  }

  describe('validateFileSignature', () => {
    it('should accept a valid JPEG buffer with image/jpeg MIME type', () => {
      const buffer = buildBuffer([0xff, 0xd8, 0xff, 0xe0]);

      expect(validateFileSignature(buffer, 'image/jpeg')).toBe(true);
    });

    it('should accept a valid JPEG buffer with image/jpg MIME type', () => {
      const buffer = buildBuffer([0xff, 0xd8, 0xff, 0xe1]);

      expect(validateFileSignature(buffer, 'image/jpg')).toBe(true);
    });

    it('should accept a valid PNG buffer', () => {
      const buffer = buildBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      expect(validateFileSignature(buffer, 'image/png')).toBe(true);
    });

    it('should accept a valid PDF buffer', () => {
      const buffer = buildBuffer([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      expect(validateFileSignature(buffer, 'application/pdf')).toBe(true);
    });

    it('should accept a valid HEIC buffer with ftyp at offset 4', () => {
      const buffer = buildBuffer([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);

      expect(validateFileSignature(buffer, 'image/heic')).toBe(true);
    });

    it('should reject a text file declared as image/jpeg', () => {
      const buffer = Buffer.from('Hello, this is a plain text file with no magic bytes');

      expect(validateFileSignature(buffer, 'image/jpeg')).toBe(false);
    });

    it('should reject a PNG buffer declared as image/jpeg', () => {
      const buffer = buildBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      expect(validateFileSignature(buffer, 'image/jpeg')).toBe(false);
    });

    it('should reject a JPEG buffer declared as application/pdf', () => {
      const buffer = buildBuffer([0xff, 0xd8, 0xff, 0xe0]);

      expect(validateFileSignature(buffer, 'application/pdf')).toBe(false);
    });

    it('should allow unknown MIME types through (no known signature to check)', () => {
      const buffer = Buffer.from('some random content');

      expect(validateFileSignature(buffer, 'text/plain')).toBe(true);
    });

    it('should handle case-insensitive MIME types', () => {
      const buffer = buildBuffer([0xff, 0xd8, 0xff, 0xe0]);

      expect(validateFileSignature(buffer, 'IMAGE/JPEG')).toBe(true);
    });

    it('should handle MIME types with leading/trailing whitespace', () => {
      const buffer = buildBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      expect(validateFileSignature(buffer, '  image/png  ')).toBe(true);
    });

    it('should reject a buffer that is too short for the declared type', () => {
      const buffer = Buffer.from([0xff, 0xd8]);

      expect(validateFileSignature(buffer, 'image/jpeg')).toBe(false);
    });
  });

  describe('getFileTypeFromSignature', () => {
    it('should detect JPEG from magic bytes', () => {
      const buffer = buildBuffer([0xff, 0xd8, 0xff, 0xe0]);

      expect(getFileTypeFromSignature(buffer)).toBe('image/jpeg');
    });

    it('should detect PNG from magic bytes', () => {
      const buffer = buildBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      expect(getFileTypeFromSignature(buffer)).toBe('image/png');
    });

    it('should detect PDF from magic bytes', () => {
      const buffer = buildBuffer([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      expect(getFileTypeFromSignature(buffer)).toBe('application/pdf');
    });

    it('should detect HEIC from ftyp marker at offset 4', () => {
      const buffer = buildBuffer([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);

      expect(getFileTypeFromSignature(buffer)).toBe('image/heic');
    });

    it('should return null for unknown byte sequences', () => {
      const buffer = Buffer.from('Hello, world! This is plain text.');

      expect(getFileTypeFromSignature(buffer)).toBeNull();
    });

    it('should return null for an empty buffer', () => {
      const buffer = Buffer.alloc(0);

      expect(getFileTypeFromSignature(buffer)).toBeNull();
    });

    it('should return null for a buffer too short to match any signature', () => {
      const buffer = Buffer.from([0x00, 0x01]);

      expect(getFileTypeFromSignature(buffer)).toBeNull();
    });
  });
});
