// Supabase Edge Function: policy-assistant
// Calls OpenRouter chat completions with a concise procurement policy assistant system prompt

import "https://deno.land/std@0.224.0/dotenv/load.ts"; // Loads .env for local dev
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type ChatRequest = {
  prompt?: string;
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(),
      status: 204,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Only POST requests allowed" }, 405);
  }

  if (!OPENROUTER_API_KEY) {
    return json({ error: "Server misconfigured: missing OPENROUTER_API_KEY" }, 500);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ChatRequest;
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return json({ error: "Missing prompt text" }, 400);
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://supabase-functions",
        "X-Title": "Policy Assistant",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-235b-a22b:free",
        messages: [
          {
            role: "system",
            content:
              "You are an AI Procurement Policy Assistant. Give concise, factual, and clearly formatted answers (no asterisks or markdown). Limit output to about 6 lines per response.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    // deno-lint-ignore no-explicit-any
    let message: string | undefined =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.message?.reasoning?.trim() ||
      data?.choices?.[0]?.message?.reasoning_details?.[0]?.text?.trim();

    if (!message) {
      return json({ reply: "No valid content from model." }, 200);
    }

    if (message.length > 800) {
      message = message.substring(0, 800) + "...";
    }

    return json({ reply: message }, 200);
  } catch (error) {
    console.error("OpenRouter API Error:", error);
    return json({ error: "Failed to fetch response from OpenRouter API." }, 500);
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as HeadersInit;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}


