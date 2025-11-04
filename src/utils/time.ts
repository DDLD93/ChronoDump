export function utcTimestamp(): string {
  // 2025-11-05T22-01-33Z (safe for filenames)
  const iso = new Date().toISOString();
  return iso.replace(/[:]/g, '-');
}

