import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { apiKey, apiSecret, userId } = await req.json();

    if (!apiKey || !apiSecret || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKey);
    const secretData = encoder.encode(apiSecret);
    
    const apiKeyEncoded = btoa(String.fromCharCode(...keyData));
    const apiSecretEncoded = btoa(String.fromCharCode(...secretData));

    const { data, error } = await supabaseClient
      .from("mexc_connections")
      .upsert({
        user_id: userId,
        api_key_encrypted: apiKeyEncoded,
        api_secret_encrypted: apiSecretEncoded,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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