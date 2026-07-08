# API environment variables

## React/Vite app

Vite only exposes browser-side environment variables whose names start with `VITE_`.

Set one of these:

```env
VITE_CLOUDFLARE_WORKER_URL=https://your-worker.your-subdomain.workers.dev
```

or, for local direct Google API testing only:

```env
VITE_GOOGLE_AI_STUDIO_APIKEY=your_google_ai_studio_key
```

When `VITE_CLOUDFLARE_WORKER_URL` exists, the app calls:

```text
POST {VITE_CLOUDFLARE_WORKER_URL}/generate-product-image
```

If it is missing, the app falls back to calling Google directly with
`VITE_GOOGLE_AI_STUDIO_APIKEY`.

## Cloudflare Worker

The Worker must keep the Google key as a Cloudflare secret:

```text
GOOGLE_AI_STUDIO_APIKEY
```

Do not prefix this Worker secret with `VITE_`. `VITE_` is only for values that
are intentionally bundled into the browser app.

See `cloudflare-worker/worker.js` for the expected Worker endpoint shape.
