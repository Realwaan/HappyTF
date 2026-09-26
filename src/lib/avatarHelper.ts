export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&crop=faces&q=85';

/**
 * Returns a guaranteed valid, non-empty image URL for avatars.
 * Prevents React/Next.js from throwing:
 * "Error: An empty string ("") was passed to the src attribute."
 */
export function getSafeAvatar(avatarUrl?: string | null, seedName?: string): string {
  if (typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
    return avatarUrl.trim();
  }
  if (typeof seedName === 'string' && seedName.trim().length > 0) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seedName.trim())}`;
  }
  return DEFAULT_AVATAR;
}
