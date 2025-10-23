import { supabase } from './supabase';

export async function connectMexc(apiKey: string, apiSecret: string, label?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mexc-connect/connect`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ apiKey, apiSecret, label }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to connect');
  }

  return await res.json();
}

export async function mexcStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { connected: false };

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mexc-connect/status`, {
    headers: { authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    return { connected: false };
  }

  return await res.json();
}
