import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENC_KEY_B64 = Deno.env.get("ENC_KEY")!;

const te = new TextEncoder();
const td = new TextDecoder();

function b64encode(buf: Uint8Array) {
  return btoa(String.fromCharCode(...buf));
}

function b64decode(b64: string) {
  return new Uint8Array(atob(b64).split("").map((c) => c.charCodeAt(0)));
}

async function importKey() {
  return await crypto.subtle.importKey(
    "raw",
    b64decode(ENC_KEY_B64),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey();
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(plain));
  return { ct: b64encode(new Uint8Array(ctBuf)), iv: b64encode(iv) };
}

async function decrypt(ctB64: string, ivB64: string) {
  const key = await importKey();
  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64),
  );
  return td.decode(ptBuf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && url.pathname.endsWith("/connect")) {
      const { apiKey, apiSecret, label } = await req.json();

      if (!apiKey || !apiSecret) {
        return new Response(JSON.stringify({ error: "apiKey and apiSecret are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [ek, es] = await Promise.all([encrypt(apiKey), encrypt(apiSecret)]);

      const { error } = await supabase.from("mexc_connections").upsert(
        {
          user_id: user.id,
          label: label ?? null,
          api_key_ct: ek.ct,
          api_key_iv: ek.iv,
          api_secret_ct: es.ct,
          api_secret_iv: es.iv,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && url.pathname.endsWith("/status")) {
      const { data } = await supabase
        .from("mexc_connections_public")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({ connected: !!data, updated_at: data?.updated_at ?? null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "GET" && url.pathname.endsWith("/keys")) {
      const { data, error } = await supabase
        .from("mexc_connections")
        .select("api_key_ct, api_key_iv, api_secret_ct, api_secret_iv")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Not connected" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiKey = await decrypt(data.api_key_ct, data.api_key_iv);
      const apiSecret = await decrypt(data.api_secret_ct, data.api_secret_iv);

      return new Response(JSON.stringify({ apiKey, apiSecret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
