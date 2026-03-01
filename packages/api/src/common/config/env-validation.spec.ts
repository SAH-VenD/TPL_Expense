import { validateEnvironment } from './env-validation';

describe('validateEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function setValidEnv(): void {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    process.env.JWT_ACCESS_SECRET = 'a-real-access-secret-value-1234';
    process.env.JWT_REFRESH_SECRET = 'a-real-refresh-secret-value-5678';
  }

  describe('required variables', () => {
    it('should throw when DATABASE_URL is missing', () => {
      process.env.JWT_ACCESS_SECRET = 'valid-secret';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';
      delete process.env.DATABASE_URL;

      expect(() => validateEnvironment()).toThrow('DATABASE_URL is required but not set');
    });

    it('should throw when JWT_ACCESS_SECRET is missing', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';
      delete process.env.JWT_ACCESS_SECRET;

      expect(() => validateEnvironment()).toThrow('JWT_ACCESS_SECRET is required but not set');
    });

    it('should throw when JWT_REFRESH_SECRET is missing', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_ACCESS_SECRET = 'valid-secret';
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => validateEnvironment()).toThrow('JWT_REFRESH_SECRET is required but not set');
    });

    it('should throw when a required variable is an empty string', () => {
      process.env.DATABASE_URL = '';
      process.env.JWT_ACCESS_SECRET = 'valid-secret';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';

      expect(() => validateEnvironment()).toThrow('DATABASE_URL is required but not set');
    });

    it('should throw when a required variable is whitespace only', () => {
      process.env.DATABASE_URL = '   ';
      process.env.JWT_ACCESS_SECRET = 'valid-secret';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';

      expect(() => validateEnvironment()).toThrow('DATABASE_URL is required but not set');
    });

    it('should list all missing variables in a single error', () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => validateEnvironment()).toThrow(/DATABASE_URL.*JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET/s);
    });
  });

  describe('insecure value rejection', () => {
    it('should reject "changeme" as JWT_ACCESS_SECRET', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_ACCESS_SECRET = 'changeme';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';

      expect(() => validateEnvironment()).toThrow('insecure example value');
    });

    it('should reject "your-secret-key" as JWT_REFRESH_SECRET', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_ACCESS_SECRET = 'valid-secret';
      process.env.JWT_REFRESH_SECRET = 'your-secret-key';

      expect(() => validateEnvironment()).toThrow('insecure example value');
    });

    it('should reject "secret" (case-insensitive)', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_ACCESS_SECRET = 'SECRET';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';

      expect(() => validateEnvironment()).toThrow('insecure example value');
    });

    it('should reject "password" as an insecure value', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_ACCESS_SECRET = 'password';
      process.env.JWT_REFRESH_SECRET = 'valid-secret';

      expect(() => validateEnvironment()).toThrow('insecure example value');
    });
  });

  describe('valid environment', () => {
    it('should not throw when all required variables are valid', () => {
      setValidEnv();

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should return undefined on success', () => {
      setValidEnv();

      expect(validateEnvironment()).toBeUndefined();
    });
  });

  describe('production warnings', () => {
    it('should warn when FRONTEND_URL is missing in production', () => {
      setValidEnv();
      process.env.NODE_ENV = 'production';
      process.env.SMTP_HOST = 'smtp.example.com';
      delete process.env.FRONTEND_URL;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateEnvironment();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('FRONTEND_URL is not set'),
      );
    });

    it('should warn when SMTP_HOST is missing in production', () => {
      setValidEnv();
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.example.com';
      delete process.env.SMTP_HOST;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateEnvironment();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMTP_HOST is not set'),
      );
    });

    it('should not warn about production variables in development', () => {
      setValidEnv();
      process.env.NODE_ENV = 'development';
      delete process.env.FRONTEND_URL;
      delete process.env.SMTP_HOST;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateEnvironment();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn when production variables are present', () => {
      setValidEnv();
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.example.com';
      process.env.SMTP_HOST = 'smtp.example.com';

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateEnvironment();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
