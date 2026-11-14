import apper from 'https://cdn.apper.io/actions/apper-actions.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const METRIC_KEYS = ['pendingSubscriptions', 'expiringSubscriptions', 'overdueSubscriptions', 'newFeedback', 'errorsLast24h'];

const SYSTEM_PROMPT =
  'You are an operations analyst for SpardhaOS, a study platform for Maharashtra competitive exams. You receive aggregate platform counts as JSON. Write a short operations brief for the admin in plain English: one line on what needs attention now, one line on the main risk, and one line recommending the next action. Use only the numbers provided and do not invent figures.';

apper.serve(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, message: 'Request body must be valid JSON' });
  }

  const metrics = body?.metrics;
  if (!metrics || typeof metrics !== 'object') {
    return json(400, { success: false, message: 'metrics object is required' });
  }

  const clean = {};
  for (const key of METRIC_KEYS) {
    const value = Number(metrics[key]);
    if (!Number.isFinite(value) || value < 0) {
      return json(400, { success: false, message: `metrics.${key} must be a non-negative number` });
    }
    clean[key] = Math.floor(value);
  }

  const apiKey = await apper.getSecret('GOOGLE_API_KEY').catch(() => null);
  if (!apiKey) {
    return json(503, { success: false, message: 'AI service is not configured' });
  }

  let res;
  try {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(clean) }] }],
      }),
    });
  } catch {
    return json(502, { success: false, message: 'AI service is unreachable' });
  }

  if (!res.ok) {
    return json(502, { success: false, message: `AI service responded ${res.status}` });
  }

  const payload = await res.json().catch(() => null);
  const brief = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!brief) {
    return json(502, { success: false, message: 'AI service returned no brief' });
  }

  return json(200, { success: true, data: { brief } });
});