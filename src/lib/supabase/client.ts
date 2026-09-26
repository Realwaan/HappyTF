import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  return url !== 'https://your-project.supabase.co' && !url.includes('placeholder');
};

let clientInstance: SupabaseClient | null = null;

export const createClient = (): SupabaseClient => {
  if (clientInstance && typeof window !== 'undefined') {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
  });

  if (typeof window !== 'undefined') {
    clientInstance = client;
  }

  return client;
};

