const REQUIRED_VARIABLES = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

const PRODUCTION_RECOMMENDED_VARIABLES = ['FRONTEND_URL', 'SMTP_HOST'] as const;

const INSECURE_VALUES = [
  'your-secret-key',
  'changeme',
  'secret',
  'password',
  'your-secret',
  'example',
  'test-secret',
  'replace-me',
];

function isInsecureValue(value: string): boolean {
  return INSECURE_VALUES.includes(value.toLowerCase().trim());
}

export function validateEnvironment(): void {
  const errors: string[] = [];

  for (const name of REQUIRED_VARIABLES) {
    const value = process.env[name];

    if (!value || value.trim() === '') {
      errors.push(`${name} is required but not set`);
      continue;
    }

    if (isInsecureValue(value)) {
      errors.push(`${name} contains an insecure example value ("${value}")`);
    }
  }

  // Conditional S3 validation
  if (process.env.STORAGE_TYPE === 's3') {
    const s3Variables = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_S3_BUCKET',
    ] as const;
    for (const name of s3Variables) {
      if (!process.env[name] || process.env[name].trim() === '') {
        errors.push(`${name} is required when STORAGE_TYPE is 's3'`);
      }
    }
  }

  // Conditional SMTP validation
  if (process.env.SMTP_HOST && !process.env.SMTP_PORT) {
    errors.push('SMTP_PORT is required when SMTP_HOST is set');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const name of PRODUCTION_RECOMMENDED_VARIABLES) {
      const value = process.env[name];

      if (!value || value.trim() === '') {
        console.warn(`[env-validation] WARNING: ${name} is not set (recommended in production)`);
      }
    }
  }
}
