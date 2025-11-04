export function utcTimestamp(): string {
  // 2025-11-05T22-01-33Z (safe for filenames)
  const iso = new Date().toISOString();
  // Replace colons with hyphens and remove milliseconds for cleaner filenames
  return iso.replace(/[:]/g, '-').replace(/\.\d{3}/, '');
}

