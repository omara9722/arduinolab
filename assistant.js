// Vercel serverless function: POST /api/assistant
// { mode, circuit, code, serialOutput, spec, message } -> { text }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in the Vercel project settings.' });
    return;
  }

  const { mode = 'general', circuit = '', code = '', serialOutput = '', spec = '', message = '' } = req.body || {};

  const prompt = `You are an embedded teaching assistant inside a university Arduino circuit simulator.

Current circuit (component: pin -> board pin):
${circuit}

Current sketch code:
\`\`\`
${code}
\`\`\`

Recent serial monitor output:
${String(serialOutput).slice(-800)}

Assignment spec (if relevant):
${spec}

Task type: ${mode}
Student message: ${message}

Respond concisely, in plain teaching language. If debugging, point to the exact
line/logic issue. If grading, give a short pass/fail per requirement then an
overall verdict. If explaining, describe what happens electrically and in code,
step by step but brief.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await r.json();
    const text = (data.content || []).map(b => (b.type === 'text' ? b.text : '')).join('\n');
    res.status(200).json({ text: text || 'No response.' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
