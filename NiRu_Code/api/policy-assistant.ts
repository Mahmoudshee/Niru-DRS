import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') return res.status(200).end();
	if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

	const { prompt } = (req.body || {}) as { prompt?: string };
	const apiKey = process.env.OPENROUTER_API_KEY;

	if (!apiKey) return res.status(401).json({ error: 'Missing API key' });
	if (!prompt) return res.status(400).json({ error: 'Missing prompt text' });

	try {
		const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'qwen/qwen3-235b-a22b:free',
				messages: [
					{ role: 'system', content: 'You are a professional procurement policy analyzer. Respond concisely and clearly.' },
					{ role: 'user', content: prompt },
				],
			}),
		});

		const data = await aiRes.json();
		const reply = data?.choices?.[0]?.message?.content || 'No valid AI response.';

		res.status(200).json({ reply });
	} catch (error) {
		console.error('AI API error:', error);
		res.status(500).json({ error: 'Failed to connect to OpenRouter' });
	}
}


