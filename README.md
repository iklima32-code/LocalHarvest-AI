# LocalHarvest AI

AI-powered marketing content generator for farm products. Generate professional product images and promo videos instantly — no design skills needed.

## Features

- **AI Image Generation** — DALL-E 3, Replicate FLUX.1, or Stability SDXL with Claude-expanded prompts
- **Promo Video Generation** — Replicate Stable Video Diffusion (image-to-video) or canvas Ken Burns animation with ambient music
- **Personalization** — Farm name, photography style (Photorealistic / Golden Hour / Rustic / Minimal), and intent (Promote / Educate / Social Media)
- **Smart Unsplash Fallback** — 70+ verified product-to-photo mappings when no AI key is present
- **Debounced Auto-Generation** — Content updates automatically as you type

## Stack

- **Frontend**: Vite + React 18
- **Backend**: Express.js (ESM)
- **AI**: Anthropic Claude Haiku (prompt expansion), DALL-E 3, Replicate, Stability AI
- **Video**: Replicate SVD / WAN 2.1 / Canvas + Web Audio API

## Getting Started

### 1. Install dependencies

```bash
cd localharvest-ai
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Add your API keys to `.env`:

```env
ANTHROPIC_API_KEY=your_key_here        # Required — prompt expansion
OPENAI_API_KEY=your_key_here           # Optional — DALL-E 3 image generation
REPLICATE_API_KEY=your_key_here        # Optional — FLUX image + SVD video generation
STABILITY_API_KEY=your_key_here        # Optional — Stability SDXL image generation
```

At minimum, only `ANTHROPIC_API_KEY` is required. Without AI image keys, the app falls back to Unsplash photos.

### 3. Run the app

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API server (port 3001) concurrently.

> **WSL2 users**: Access the app via your WSL2 IP (e.g. `http://172.17.x.x:5173`) rather than `localhost`.

## Project Structure

```
localharvest-ai/
├── server/
│   └── server.js        # Express API (image + video generation endpoints)
├── src/
│   ├── App.jsx          # Main React app
│   ├── main.jsx
│   └── index.css
├── .env                 # API keys (not committed)
├── package.json
└── vite.config.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-image` | Generate product image |
| POST | `/api/generate-video` | Submit video generation job |
| GET | `/api/poll-video/:id` | Poll Replicate job status |

## Contributing

Branch off `main`, make your changes, and open a pull request.
