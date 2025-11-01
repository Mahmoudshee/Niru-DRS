import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') return res.status(200).end();
	if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

	const { prompt } = (req.body || {}) as { prompt?: string };
	const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

	if (!apiKey) return res.status(401).json({ error: 'Missing API key' });
	if (!prompt) return res.status(400).json({ error: 'Missing prompt text' });

	try {
		const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{ role: 'system', content: 'You are a procurement approver AI assistant. Provide clear approval decisions with concise reasoning.' },
					{ role: 'user', content: prompt },
				],
				temperature: 0.5,
			}),
		});

		const data = await aiRes.json();
		
		if (!aiRes.ok) {
			throw new Error(data.error?.message || 'Groq API error');
		}

		const reply = data?.choices?.[0]?.message?.content || 'No valid AI response.';

		res.status(200).json({ reply });
	} catch (error) {
		console.error('AI API error:', error);
		res.status(500).json({ error: 'Failed to connect to Groq API' });
	}
}

