import apper from 'https://cdn.apper.io/actions/apper-actions.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const SYSTEM_PROMPT =
  'You are an AI study tutor for Maharashtra competitive exams (MPSC and related). Answer in simple, clear Marathi (Devanagari), step by step. Keep answers concise and factual. If the question is outside exam preparation, politely redirect to exam topics. Advise the student to verify important facts against official sources.';

apper.serve(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, message: 'Request body must be valid JSON' });
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > 1000) {
    return json(400, { success: false, message: 'question is required (max 1000 characters)' });
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
        contents: [{ role: 'user', parts: [{ text: question }] }],
      }),
    });
  } catch {
    return json(502, { success: false, message: 'AI service is unreachable' });
  }

  if (!res.ok) {
    return json(502, { success: false, message: `AI service responded ${res.status}` });
  }

  const payload = await res.json();
  const answer = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!answer) {
    return json(502, { success: false, message: 'AI service returned no answer' });
  }

  return json(200, { success: true, data: { answer } });
});