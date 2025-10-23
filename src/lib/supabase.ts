import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type MexcConnection = {
  id: string;
  user_id: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
};

export type Trade = {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  quantity: number;
  price: number | null;
  status: string;
  mexc_order_id: string | null;
  executed_at: string | null;
  created_at: string;
};
