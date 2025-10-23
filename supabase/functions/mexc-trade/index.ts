import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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

    const { userId, symbol, side, orderType, quantity, price } = await req.json();

    if (!userId || !symbol || !side || !orderType || !quantity) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: connection, error: connError } = await supabaseClient
      .from("mexc_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "MEXC connection not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const decoder = new TextDecoder();
    const apiKey = decoder.decode(
      Uint8Array.from(atob(connection.api_key_encrypted), c => c.charCodeAt(0))
    );
    const apiSecret = decoder.decode(
      Uint8Array.from(atob(connection.api_secret_encrypted), c => c.charCodeAt(0))
    );

    const timestamp = Date.now();
    const params = new URLSearchParams({
      symbol,
      side,
      type: orderType,
      quantity: quantity.toString(),
      timestamp: timestamp.toString(),
    });

    if (orderType === "LIMIT" && price) {
      params.append("price", price.toString());
      params.append("timeInForce", "GTC");
    }

    const queryString = params.toString();
    const signature = createHmac("sha256", apiSecret)
      .update(queryString)
      .digest("hex");

    const signedParams = `${queryString}&signature=${signature}`;

    const mexcResponse = await fetch(
      `https://api.mexc.com/api/v3/order?${signedParams}`,
      {
        method: "POST",
        headers: {
          "X-MEXC-APIKEY": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const mexcData = await mexcResponse.json();

    if (!mexcResponse.ok) {
      throw new Error(mexcData.msg || "MEXC API error");
    }

    const { error: tradeError } = await supabaseClient
      .from("trades")
      .insert({
        user_id: userId,
        symbol,
        side,
        order_type: orderType,
        quantity,
        price: price || null,
        status: mexcData.status || "PENDING",
        mexc_order_id: mexcData.orderId?.toString() || null,
        executed_at: new Date().toISOString(),
      });

    if (tradeError) {
      console.error("Failed to record trade:", tradeError);
    }

    return new Response(
      JSON.stringify({ success: true, data: mexcData }),
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