import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const MODEL = 'gemini-2.5-flash-image';
const CLASSIFY_MODEL = 'gemini-2.5-flash';

// Keep in sync with src/services/productClassification.js.
const PRODUCT_SHAPE_CATEGORIES = [
  'chair', 'table', 'sofa', 'shelf', 'cabinet', 'monitor', 'lamp', 'plant', 'appliance', 'box',
];

function buildPrompt(productName) {
  return `A clean, simple, flat-style product icon illustration of "${productName}", isolated on a plain white background, no shadows, no text, no watermark, minimal furniture/product catalog icon style, front or 3/4 view.`;
}

function buildClassifyPrompt(productName) {
  return `Classify the furniture/product named "${productName}" into exactly one of these categories: ${PRODUCT_SHAPE_CATEGORIES.join(', ')}. Reply with only the single category word in lowercase, nothing else. If none fit well, reply "box".`;
}

function extractCategory(text) {
  const match = (text || '').toLowerCase().match(/[a-z]+/);
  const category = match?.[0];
  return PRODUCT_SHAPE_CATEGORIES.includes(category) ? category : null;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function localImageGenerationPlugin(env) {
  function imageGenerationMiddleware(request, response) {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    const apiKey = env.VITE_GOOGLE_AI_STUDIO_APIKEY || env.GOOGLE_AI_STUDIO_APIKEY;

    if (!apiKey) {
      sendJson(response, 500, { error: 'VITE_GOOGLE_AI_STUDIO_APIKEY is not set.' });
      return;
    }

    handleImageGenerationRequest(request, response, apiKey);
  }

  return {
    name: 'local-image-generation-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-product-image', imageGenerationMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/generate-product-image', imageGenerationMiddleware);
    },
  };
}

function localProductClassificationPlugin(env) {
  function classificationMiddleware(request, response) {
    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    const apiKey = env.VITE_GOOGLE_AI_STUDIO_APIKEY || env.GOOGLE_AI_STUDIO_APIKEY;

    if (!apiKey) {
      sendJson(response, 500, { error: 'VITE_GOOGLE_AI_STUDIO_APIKEY is not set.' });
      return;
    }

    handleClassificationRequest(request, response, apiKey);
  }

  return {
    name: 'local-product-classification-api',
    configureServer(server) {
      server.middlewares.use('/api/classify-product', classificationMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/classify-product', classificationMiddleware);
    },
  };
}

async function handleClassificationRequest(request, response, apiKey) {
  try {
    const { productName, prompt } = await readJsonBody(request);
    const textPrompt = prompt || buildClassifyPrompt(productName);

    if (!textPrompt) {
      sendJson(response, 400, { error: 'productName or prompt is required.' });
      return;
    }

    const googleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CLASSIFY_MODEL}:generateContent?key=${apiKey}`,
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
      sendJson(response, googleResponse.status, {
        error: googleBody?.error?.message || `Google API request failed (${googleResponse.status})`,
      });
      return;
    }

    const parts = googleBody?.candidates?.[0]?.content?.parts || [];
    const text = parts.find((part) => typeof part.text === 'string')?.text;
    const category = extractCategory(text);

    if (!category) {
      sendJson(response, 502, { error: 'Google API response did not include a recognizable category.' });
      return;
    }

    sendJson(response, 200, { category });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Product classification failed.' });
  }
}

async function handleImageGenerationRequest(request, response, apiKey) {
  try {
    const { productName, prompt } = await readJsonBody(request);
    const textPrompt = prompt || buildPrompt(productName);

    if (!textPrompt) {
      sendJson(response, 400, { error: 'productName or prompt is required.' });
      return;
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
      sendJson(response, googleResponse.status, {
        error: googleBody?.error?.message || `Google API request failed (${googleResponse.status})`,
      });
      return;
    }

    const candidate = googleBody?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);

    if (!imagePart) {
      const textPart = parts.find((part) => part.text)?.text;
      const reason = textPart || candidate?.finishReason || googleBody?.promptFeedback?.blockReason;
      const detail = reason ? `: ${reason}` : '.';
      sendJson(response, 502, { error: `Google API response did not include image data${detail}` });
      return;
    }

    sendJson(response, 200, {
      mimeType: imagePart.inlineData.mimeType,
      data: imagePart.inlineData.data,
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Image generation failed.' });
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localImageGenerationPlugin(env), localProductClassificationPlugin(env)],
    resolve: {
      mainFields: ['browser', 'module', 'main'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      server: {
        deps: {
          inline: ['konva', 'react-konva'],
        },
      },
    },
  };
})
