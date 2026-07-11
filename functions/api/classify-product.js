const MODEL = 'gemini-2.5-flash';

// Keep in sync with src/services/productClassification.js.
const PRODUCT_SHAPE_CATEGORIES = [
  'chair', 'table', 'sofa', 'shelf', 'cabinet', 'monitor', 'lamp', 'plant', 'appliance', 'box',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildPrompt(productName) {
  return `Classify the furniture/product named "${productName}" into exactly one of these categories: ${PRODUCT_SHAPE_CATEGORIES.join(', ')}. Reply with only the single category word in lowercase, nothing else. If none fit well, reply "box".`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function extractCategory(text) {
  const match = (text || '').toLowerCase().match(/[a-z]+/);
  const category = match?.[0];
  return PRODUCT_SHAPE_CATEGORIES.includes(category) ? category : null;
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = env.GOOGLE_AI_STUDIO_APIKEY || env.VITE_GOOGLE_AI_STUDIO_APIKEY;

  if (!apiKey) {
    return json({ error: 'GOOGLE_AI_STUDIO_APIKEY Cloudflare Pages secret is not set.' }, 500);
  }

  const { productName, prompt } = await request.json().catch(() => ({}));
  const textPrompt = prompt || buildPrompt(productName);

  if (!textPrompt) {
    return json({ error: 'productName or prompt is required.' }, 400);
  }

  const googleResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: textPrompt }] }],
      }),
    }
  );

  const googleBody = await googleResponse.json();

  if (!googleResponse.ok) {
    return json(
      { error: googleBody?.error?.message || `Google API request failed (${googleResponse.status})` },
      googleResponse.status
    );
  }

  const parts = googleBody?.candidates?.[0]?.content?.parts || [];
  const text = parts.find((part) => typeof part.text === 'string')?.text;
  const category = extractCategory(text);

  if (!category) {
    return json({ error: 'Google API response did not include a recognizable category.' }, 502);
  }

  return json({ category });
}
