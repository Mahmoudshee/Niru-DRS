import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { prompt } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt text" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_TITLE || "Policy Assistant Prototype",
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
    let message: string | undefined =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.message?.reasoning?.trim() ||
      data?.choices?.[0]?.message?.reasoning_details?.[0]?.text?.trim();

    if (!message) {
      return res.status(200).json({ reply: "⚠️ No valid content from model. Check console logs for details." });
    }

    if (message.length > 800) {
      message = message.substring(0, 800) + "...";
    }

    return res.status(200).json({ reply: message });
  } catch (error) {
    console.error("OpenRouter API Error:", error);
    return res.status(500).json({ error: "Failed to fetch response from OpenRouter API." });
  }
}


