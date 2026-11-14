import apper from 'https://cdn.apper.io/actions/apper-actions.js';

const UPSTREAM_HEADERS = {
  'User-Agent': 'SpardhaOS/1.0 (Maharashtra exam study app)',
  Accept: 'application/json',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

async function getJson(url) {
  const res = await fetch(url, { headers: UPSTREAM_HEADERS });
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
  return res.json();
}

async function wikipediaOverview(lang, query) {
  const search = await getJson(
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=${encodeURIComponent(query)}`,
  );
  const hit = search?.query?.search?.[0];
  if (!hit) return null;
  const summary = await getJson(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
  );
  return {
    title: summary.title,
    extract: summary.extract ?? '',
    url: summary.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
  };
}

async function aiStudySummary(apiKey, examName, sources) {
  const context = sources
    .filter(Boolean)
    .map((s) => `${s.title}: ${s.extract}`)
    .join('\n\n')
    .slice(0, 8000);
  const prompt = `You are a study assistant for Maharashtra competitive exams. Using only the source text below, write a concise study overview of "${examName}" in Marathi (3-5 short bullet points covering purpose, eligibility-level, and key subjects). If the sources are insufficient, say so briefly. Do not invent facts.\n\nSources:\n${context || 'No sources found.'}`;
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`);
  const payload = await res.json();
  return payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || null;
}

apper.serve(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, message: 'Request body must be valid JSON' });
  }

  const examName = typeof body?.examName === 'string' ? body.examName.trim() : '';
  if (!examName || examName.length > 200) {
    return json(400, { success: false, message: 'examName is required (max 200 characters)' });
  }

  const [en, mr] = await Promise.all([
    wikipediaOverview('en', `${examName} Maharashtra`).catch(() => null),
    wikipediaOverview('mr', examName).catch(() => null),
  ]);

  const encoded = encodeURIComponent(examName);
  const data = {
    examName,
    overview: en,
    marathiOverview: mr,
    officialLinks: [
      { label: 'MPSC अधिकृत संकेतस्थळ', url: 'https://mpsc.gov.in' },
      { label: 'महाराष्ट्र शासन', url: 'https://maharashtra.gov.in' },
    ],
    notes: [
      { label: `${examName} नोट्स (PDF)`, url: `https://www.google.com/search?q=${encodeURIComponent(`${examName} Maharashtra notes filetype:pdf`)}` },
      { label: `${examName} मागील प्रश्नपत्रिका`, url: `https://www.google.com/search?q=${encodeURIComponent(`${examName} Maharashtra previous year question paper pdf`)}` },
    ],
    syllabus: [
      { label: `${examName} अभ्यासक्रम (Syllabus)`, url: `https://www.google.com/search?q=${encodeURIComponent(`${examName} Maharashtra syllabus pdf`)}` },
    ],
    videos: [
      { label: `${examName} व्हिडिओ लेक्चर (YouTube)`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${examName} Maharashtra lecture syllabus`)}` },
      { label: `${examName} मराठी मार्गदर्शन (YouTube)`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${examName} मार्गदर्शन`)}` },
    ],
    fetchedAt: new Date().toISOString(),
  };

  if (!en && !mr) {
    data.warning = `"${encoded}" विषयी विकिपीडियावर माहिती सापडली नाही; खालील अधिकृत व शोध दुवे वापरा.`;
  }

  try {
    const apiKey = await apper.getSecret('GOOGLE_API_KEY');
    data.aiSummary = apiKey ? await aiStudySummary(apiKey, examName, [en, mr]) : null;
  } catch (error) {
    console.info(`apper_info: Got this error in this function: fetch-exam-content. The error is: ${error.message}`);
    data.aiSummary = null;
  }

  return json(200, { success: true, data });
});