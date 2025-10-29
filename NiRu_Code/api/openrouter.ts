import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Only POST requests allowed" });
	}

	const { prompt, messages, model } = (req.body || {}) as {
		prompt?: string;
		messages?: Array<{ role: string; content: string }>;
		model?: string;
	};

	const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
	if (!OPENROUTER_API_KEY) {
		return res.status(500).json({ error: "Server misconfigured: missing OPENROUTER_API_KEY" });
	}

	try {
		const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
				"HTTP-Referer": process.env.OPENROUTER_REFERER || "http://localhost:3000",
				"X-Title": process.env.OPENROUTER_TITLE || "NiRu Policy Assistant",
			},
			body: JSON.stringify({
				model: model || "qwen/qwen3-235b-a22b:free",
				messages:
					messages && Array.isArray(messages) && messages.length > 0
						? messages
						: [
							{ role: "system", content: "You are a compliance assistant for procurement." },
							{ role: "user", content: prompt ?? "" },
						],
			}),
		});

		const data = await upstream.json();
		if (!upstream.ok) {
			return res.status(upstream.status).json(data);
		}

		return res.status(200).json(data);
	} catch (error) {
		console.error("OpenRouter proxy error:", error);
		return res.status(500).json({ error: "Failed to fetch response from OpenRouter API." });
	}
}


