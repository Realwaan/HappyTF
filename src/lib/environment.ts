/**
 * Environment configuration helper
 * In production / deployed environments, mock data and placeholders are strictly disabled.
 */
export const isDeployed = (): boolean => {
  // Explicit opt-in for mock data (e.g. for demo mode)
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true') {
    return false;
  }
  // Explicit opt-out for mock data
  if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true') {
    return true;
  }
  // Default: whenever deployed to production or Vercel, disable mock data
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
  );
};
