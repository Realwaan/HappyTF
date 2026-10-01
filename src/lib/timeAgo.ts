/**
 * HappyTF Dynamic Relative Time Utilities
 * Provides human-readable time formatting (e.g., 'Just now', '5 mins ago', '2 days ago')
 * and parses ISO timestamps, numbers, and legacy client-generated IDs.
 */

/**
 * Extracts a Unix epoch timestamp in milliseconds from a date input,
 * ISO string, or an ID formatted with an embedded timestamp (e.g., 'comm-1727823900000-abcd').
 */
export function extractTimestamp(input?: string | number | Date | null, fallbackId?: string): number | null {
  if (input instanceof Date) {
    const t = input.getTime();
    return isNaN(t) ? null : t;
  }

  if (typeof input === 'number') {
    return isNaN(input) || input <= 0 ? null : input;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if it's an ISO 8601 or standard date string
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    // Check if it's a numeric string (epoch ms)
    if (/^\d{10,14}$/.test(trimmed)) {
      const num = Number(trimmed);
      return isNaN(num) ? null : num;
    }
  }

  // If input was a legacy placeholder like "Just now" or empty, try extracting from fallbackId
  const candidateId = fallbackId || (typeof input === 'string' ? input : undefined);
  if (candidateId) {
    // Matches patterns like 'comm-1727823900000-abcd', 'act-1727823900000', 'notif-1727823900000'
    const idMatch = candidateId.match(/(?:comm|act|notif|item|tk|grp)-(\d{12,14})/);
    if (idMatch && idMatch[1]) {
      const parsedIdTime = Number(idMatch[1]);
      if (!isNaN(parsedIdTime) && parsedIdTime > 1600000000000 && parsedIdTime < 3000000000000) {
        return parsedIdTime;
      }
    }
  }

  return null;
}

/**
 * Formats a given timestamp or ISO string into a dynamic relative time string.
 * If input is an unparseable legacy string like "15 mins ago", it returns it as-is.
 */
export function formatRelativeTime(
  input?: string | number | Date | null,
  fallbackId?: string,
  nowMs: number = Date.now()
): string {
  // If input is already a relative description (e.g., from mock data '15 mins ago', '1 hour ago')
  // and NOT a generic stale 'Just now', preserve it
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.includes('ago') || trimmed.includes('Yesterday') || trimmed.includes('Tomorrow')) {
      return trimmed;
    }
  }

  const timestamp = extractTimestamp(input, fallbackId);
  if (timestamp === null) {
    // If we could not extract a timestamp, return the original string or fallback
    return typeof input === 'string' && input.trim() ? input.trim() : 'Just now';
  }

  const diffMs = nowMs - timestamp;

  // Handle future dates (e.g., slight clock skew between client and server)
  if (diffMs < 45 * 1000) {
    return 'Just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes === 1) {
    return '1 min ago';
  }
  if (minutes < 60) {
    return `${minutes} mins ago`;
  }
  if (hours === 1) {
    return '1 hour ago';
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }
  if (days === 1) {
    return '1 day ago';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (weeks === 1) {
    return '1 week ago';
  }
  if (weeks < 4) {
    return `${weeks} weeks ago`;
  }
  if (months === 1) {
    return '1 month ago';
  }
  if (months < 12) {
    return `${months} months ago`;
  }
  if (years === 1) {
    return '1 year ago';
  }
  return `${years} years ago`;
}

/**
 * Returns a detailed localized date and time string suitable for element title attributes / tooltips.
 */
export function formatFullDateTime(input?: string | number | Date | null, fallbackId?: string): string {
  const timestamp = extractTimestamp(input, fallbackId);
  if (!timestamp) {
    return typeof input === 'string' ? input : '';
  }
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
