export function maskStudentName(name?: string, fallback = '-'): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;

  const chars = Array.from(trimmed);
  if (chars.length === 1) return '*';
  if (chars.length === 2) return `${chars[0]}*`;
  if (chars.length === 3) return `${chars[0]}*${chars[2]}`;

  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

export function maskStudentDisplayName(displayName?: string, fallback = '-'): string {
  return displayName?.trim() ? maskStudentName(displayName) : fallback;
}
