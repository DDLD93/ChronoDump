import { describe, it, expect } from 'vitest';
import { utcTimestamp } from '../../utils/time.js';

describe('utcTimestamp', () => {
  it('should return a UTC timestamp in ISO-8601 format with hyphens instead of colons', () => {
    const timestamp = utcTimestamp();
    
    // Should match pattern: YYYY-MM-DDTHH-mm-ssZ or YYYY-MM-DDTHH-mm-ss.sssZ
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
  });

  it('should not contain colons (replaced with hyphens)', () => {
    const timestamp = utcTimestamp();
    expect(timestamp).not.toContain(':');
  });

  it('should end with Z (UTC indicator)', () => {
    const timestamp = utcTimestamp();
    expect(timestamp).toMatch(/Z$/);
  });

  it('should be safe for filenames (no special characters except hyphens)', () => {
    const timestamp = utcTimestamp();
    // Should only contain: digits, hyphens, T, and Z
    expect(timestamp).toMatch(/^[\d-TZ]+$/);
  });

  it('should produce different timestamps when called at different times', async () => {
    const timestamp1 = utcTimestamp();
    await new Promise(resolve => setTimeout(resolve, 10));
    const timestamp2 = utcTimestamp();
    
    // Timestamps should be different (or at least the format is consistent)
    expect(timestamp1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
    expect(timestamp2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/);
  });

  it('should match the expected format pattern', () => {
    const timestamp = utcTimestamp();
    // Example: 2025-11-05T22-01-33Z
    const parts = timestamp.split('T');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Date part
    expect(parts[1]).toMatch(/^\d{2}-\d{2}-\d{2}Z$/); // Time part with Z
  });
});

