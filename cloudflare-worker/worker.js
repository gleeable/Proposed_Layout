const MODEL = 'gemini-2.5-flash-image';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST' || url.pathname !== '/generate-product-image') {
      return json({ error: 'Not found' }, 404);
    }

    if (!env.GOOGLE_AI_STUDIO_APIKEY) {
      return json({ error: 'GOOGLE_AI_STUDIO_APIKEY Cloudflare secret is not set.' }, 500);
    }

    const { productName, prompt } = await request.json().catch(() => ({}));
    const textPrompt = prompt || productName;

    if (!textPrompt) {
      return json({ error: 'productName or prompt is required.' }, 400);
    }

    const googleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GOOGLE_AI_STUDIO_APIKEY}`,
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
    const imagePart = parts.find((part) => part.inlineData?.data);

    if (!imagePart) {
      return json({ error: 'Google API response did not include image data.' }, 502);
    }

    return json({
      mimeType: imagePart.inlineData.mimeType,
      data: imagePart.inlineData.data,
    });
  },
};
