import DOMPurify from 'dompurify';

const TEAM_NAME_REGEX = /^[A-Za-z0-9 _.-]{3,32}$/;

function removeControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '');
}

function baseSanitize(value: string): string {
  if (typeof window === 'undefined') {
    return value.replace(/<[^>]*>/g, '');
  }

  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function sanitizePlainText(value: string, maxLength = 2000): string {
  const normalized = removeControlChars(String(value ?? '')).trim();
  if (!normalized) return '';

  const sanitized = baseSanitize(normalized)
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized.slice(0, maxLength);
}

export function sanitizeMultilineText(value: string, maxLength = 8000): string {
  const normalized = removeControlChars(String(value ?? ''));
  if (!normalized.trim()) return '';

  const sanitized = baseSanitize(normalized)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return sanitized.slice(0, maxLength);
}

export function sanitizeTeamName(value: string): string {
  const sanitized = sanitizePlainText(value, 32).replace(/\s+/g, ' ').trim();
  return sanitized;
}

export function isValidTeamName(value: string): boolean {
  return TEAM_NAME_REGEX.test(value);
}

export function safeDisplayText(value: string, maxLength = 250): string {
  return sanitizePlainText(value, maxLength);
}
