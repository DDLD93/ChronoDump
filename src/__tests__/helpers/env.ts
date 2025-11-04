import { vi } from 'vitest';

/**
 * Helper to set environment variables for tests and restore them after
 */
export function withEnv(envVars: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const originalEnv = { ...process.env };
  
  // Set new env vars
  Object.entries(envVars).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  return async () => {
    // Restore original env
    process.env = originalEnv;
    await fn();
  };
}

/**
 * Mock process.env for a test
 */
export function mockEnv(envVars: Record<string, string>) {
  const originalEnv = { ...process.env };
  
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  return () => {
    process.env = originalEnv;
  };
}

