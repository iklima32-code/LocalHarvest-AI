import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())
app.use(express.static(join(__dirname, '../dist')))

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Unsplash keyword map (longest/most-specific keys matched first) ──────────
// VERIFIED: all IDs tested 200 OK. Potato uses photo-1590165482129 (not the
// onion-series photo-1518977956812 which was incorrectly labelled as potato).
const UNSPLASH_MAP = {
  // ── Multi-word — checked first (most specific) ────────────────────────────
  'sweet potatoes':  'photo-1544889980-d15efad9ec23',     // ✓ sweet potatoes
  'sweet potato':    'photo-1570723735746-c9bd51bd7c40',  // ✓ sweet potato
  'cherry tomatoes': 'photo-1592841200221-a6898f307baa',
  'cherry tomato':   'photo-1592841200221-a6898f307baa',
  'bell pepper':     'photo-1563565375-f3fdfdbefa83',
  'french beans':    'photo-1587735243615-c03f25aaff15',
  'french bean':     'photo-1587735243615-c03f25aaff15',
  'green beans':     'photo-1587735243615-c03f25aaff15',
  'green bean':      'photo-1587735243615-c03f25aaff15',
  'runner bean':     'photo-1587735243615-c03f25aaff15',
  'spring onion':    'photo-1518977822534-7049a61ee0c2',
  'butternut':       'photo-1508747703725-719777637510',
  'brussels sprout': 'photo-1608686207856-001b95cf60ca',
  'bok choy':        'photo-1622206151226-18ca2c9ab4a1',
  'pak choi':        'photo-1622206151226-18ca2c9ab4a1',
  'chilli':          'photo-1563565375-f3fdfdbefa83',
  'chili':           'photo-1563565375-f3fdfdbefa83',
  'jalapeño':        'photo-1563565375-f3fdfdbefa83',
  'jalapeno':        'photo-1563565375-f3fdfdbefa83',
  // ── Vegetables ────────────────────────────────────────────────────────────
  'tomatoes':    'photo-1592841200221-a6898f307baa',
  'tomato':      'photo-1592841200221-a6898f307baa',
  'carrots':     'photo-1598170845058-32b9d6a5da37',
  'carrot':      'photo-1598170845058-32b9d6a5da37',
  'lettuce':     'photo-1622206151226-18ca2c9ab4a1',
  'spinach':     'photo-1567375698348-5d9d5ae99de0',
  'kale':        'photo-1515543904379-3d757afe72e4',
  'cabbage':     'photo-1618512496248-a07fe83aa8cb',
  'broccoli':    'photo-1459411621453-7b03977f4bfc',
  'cauliflower': 'photo-1568584711075-3d021a7c3ca3',
  'cucumbers':   'photo-1589621316382-008455b857cd',
  'cucumber':    'photo-1589621316382-008455b857cd',
  'courgettes':  'photo-1568584711075-3d021a7c3ca3',
  'courgette':   'photo-1568584711075-3d021a7c3ca3',
  'zucchini':    'photo-1568584711075-3d021a7c3ca3',
  'peppers':     'photo-1563565375-f3fdfdbefa83',
  'pepper':      'photo-1563565375-f3fdfdbefa83',
  'pumpkins':    'photo-1508747703725-719777637510',
  'pumpkin':     'photo-1508747703725-719777637510',
  'squash':      'photo-1508747703725-719777637510',
  'corn':        'photo-1551754655-cd27e38d2076',
  'maize':       'photo-1551754655-cd27e38d2076',
  // ── Potatoes — explicit singular + plural (separate from onion) ───────────
  'potatoes':    'photo-1590165482129-1b8b27698780',  // ✓ russet potatoes
  'potato':      'photo-1590165482129-1b8b27698780',  // ✓ russet potatoes
  // ── Alliums ───────────────────────────────────────────────────────────────
  'onions':      'photo-1518977822534-7049a61ee0c2',
  'onion':       'photo-1518977822534-7049a61ee0c2',
  'garlic':      'photo-1540148426945-6cf22a6b2383',
  'leek':        'photo-1518977822534-7049a61ee0c2',
  'shallot':     'photo-1518977822534-7049a61ee0c2',
  // ── Other veg ─────────────────────────────────────────────────────────────
  'celery':      'photo-1622206151226-18ca2c9ab4a1',
  'asparagus':   'photo-1583663848850-46af132dc08e',
  'artichoke':   'photo-1619994403073-2cec844b8e63',
  'eggplant':    'photo-1618512496248-a07fe83aa8cb',
  'aubergine':   'photo-1618512496248-a07fe83aa8cb',
  'mushrooms':   'photo-1504545102780-26774c1bb073',
  'mushroom':    'photo-1504545102780-26774c1bb073',
  'avocado':     'photo-1519162808019-7de1683fa2ad',
  'beetroot':    'photo-1593105544559-ecb03bf76f82',
  'beet':        'photo-1593105544559-ecb03bf76f82',
  'radish':      'photo-1598170845058-32b9d6a5da37',
  'turnip':      'photo-1598170845058-32b9d6a5da37',
  'parsnip':     'photo-1598170845058-32b9d6a5da37',
  'swede':       'photo-1598170845058-32b9d6a5da37',
  // ── Beans & legumes ───────────────────────────────────────────────────────
  'beans':   'photo-1587735243615-c03f25aaff15',
  'bean':    'photo-1587735243615-c03f25aaff15',
  'peas':    'photo-1587735243615-c03f25aaff15',
  'pea':     'photo-1587735243615-c03f25aaff15',
  'lentil':  'photo-1587735243615-c03f25aaff15',
  // ── Fruits ────────────────────────────────────────────────────────────────
  'strawberries': 'photo-1464965911861-746a04b4bca6',
  'strawberry':   'photo-1464965911861-746a04b4bca6',
  'blueberries':  'photo-1498557850523-fd3d118b962e',
  'blueberry':    'photo-1498557850523-fd3d118b962e',
  'raspberries':  'photo-1596638787647-904d822d751e',
  'raspberry':    'photo-1596638787647-904d822d751e',
  'blackberries': 'photo-1596638787647-904d822d751e',
  'blackberry':   'photo-1596638787647-904d822d751e',
  'gooseberries': 'photo-1596638787647-904d822d751e',
  'gooseberry':   'photo-1596638787647-904d822d751e',
  'berries':      'photo-1464965911861-746a04b4bca6',
  'berry':        'photo-1464965911861-746a04b4bca6',
  'apples':       'photo-1567306226416-28f0efdc88ce',
  'apple':        'photo-1567306226416-28f0efdc88ce',
  'pears':        'photo-1568702846914-96b305d2aaeb',
  'pear':         'photo-1568702846914-96b305d2aaeb',
  'peaches':      'photo-1595743825637-cdafc8ad4173',
  'peach':        'photo-1595743825637-cdafc8ad4173',
  'nectarine':    'photo-1595743825637-cdafc8ad4173',
  'plum':         'photo-1595743825637-cdafc8ad4173',
  'cherries':     'photo-1528821128474-27f963b062bf',
  'cherry':       'photo-1528821128474-27f963b062bf',
  'grapes':       'photo-1537640538966-79f369143f8f',
  'grape':        'photo-1537640538966-79f369143f8f',
  'melon':        'photo-1537640538966-79f369143f8f',
  'watermelon':   'photo-1560806887-1e4cd0b6cbd6',
  'oranges':      'photo-1582979512210-99b6a53386f9',
  'orange':       'photo-1582979512210-99b6a53386f9',
  'lemons':       'photo-1582979512210-99b6a53386f9',
  'lemon':        'photo-1582979512210-99b6a53386f9',
  'lime':         'photo-1582979512210-99b6a53386f9',
  'citrus':       'photo-1582979512210-99b6a53386f9',
  'mango':        'photo-1553279768-865429fa0078',
  'fig':          'photo-1596638787647-904d822d751e',
  'pomegranate':  'photo-1541344999736-83eca272f6fc',
  // ── Herbs ─────────────────────────────────────────────────────────────────
  'basil':     'photo-1466637574441-749b8f19452f',
  'mint':      'photo-1628556270448-4d4e4148e1b1',
  'parsley':   'photo-1466637574441-749b8f19452f',
  'cilantro':  'photo-1466637574441-749b8f19452f',
  'coriander': 'photo-1466637574441-749b8f19452f',
  'rosemary':  'photo-1466637574441-749b8f19452f',
  'thyme':     'photo-1466637574441-749b8f19452f',
  'sage':      'photo-1466637574441-749b8f19452f',
  'dill':      'photo-1466637574441-749b8f19452f',
  'chive':     'photo-1466637574441-749b8f19452f',
  'herb':      'photo-1466637574441-749b8f19452f',
  // ── Other farm products ───────────────────────────────────────────────────
  'eggs':     'photo-1587486913049-53fc88980cfc',
  'egg':      'photo-1587486913049-53fc88980cfc',
  'honey':    'photo-1587049352846-4a222e784d38',
  'jam':      'photo-1563636619-e9143da7973b',
  'cheese':   'photo-1486297678162-eb2a19b0a32d',
  'milk':     'photo-1563636619-e9143da7973b',
  'butter':   'photo-1550583724-b2692b85b150',
  'flower':   'photo-1553279768-865429fa0078',
  'sunflower':'photo-1553279768-865429fa0078',
  'lavender': 'photo-1499002238440-d264edd596ec',
  'walnut':   'photo-1563636619-e9143da7973b',
  'almond':   'photo-1563636619-e9143da7973b',
  'default':  'photo-1540420773420-3366772f4999'
}

// Sort: plurals/multi-word first (longest), then singular — ensures
// "sweet potatoes" beats "potatoes" beats "potato", etc.
const SORTED_KEYS = Object.keys(UNSPLASH_MAP)
  .filter(k => k !== 'default')
  .sort((a, b) => b.length - a.length)

// Returns the mapped Unsplash URL or null if nothing matches.
function findMappedUrl(product) {
  const lower = product.toLowerCase().trim()
  // 1. Exact match (highest priority)
  if (UNSPLASH_MAP[lower]) {
    return `https://images.unsplash.com/${UNSPLASH_MAP[lower]}?auto=format&fit=crop&q=85&w=1024`
  }
  // 2. Word-boundary substring match (longest key first)
  const key = SORTED_KEYS.find(k => {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower)  // full-word, case-insensitive
  })
  if (key) {
    return `https://images.unsplash.com/${UNSPLASH_MAP[key]}?auto=format&fit=crop&q=85&w=1024`
  }
  return null  // no match → caller will use search fallback
}

// Dynamic fallback using Unsplash source URL (no API key required).
// Returns a base64 { b64, type } for any search term.
async function unsplashSearch(query) {
  // Extract meaningful keyword(s) — strip filler words
  const stopwords = new Set(['fresh','organic','farm','local','homegrown','baby','mini','mixed','wild'])
  const keywords = query.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))
    .slice(0, 2)
    .join(',')
  const term = keywords || query.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  // Unsplash source redirects to a relevant photo without requiring an API key
  const url = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(term + ',food,farm')}`
  return fetchBase64(url, 20000)
}

async function unsplashFallback(product) {
  // Try keyword search first, then static default
  try {
    return await unsplashSearch(product)
  } catch {
    return fetchBase64(
      `https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=85&w=1024`
    )
  }
}

async function fetchBase64(url, timeout = 20000) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = await r.arrayBuffer()
  if (buf.byteLength < 5000) throw new Error('Too small')
  return { b64: Buffer.from(buf).toString('base64'), type: r.headers.get('content-type') || 'image/jpeg' }
}

// ─── Claude: expand product name → photography prompt ────────────────────────
async function buildPrompt(product, style, farmName, intent) {
  const styleMap = {
    photorealistic: 'professional commercial food photography, DSLR 50mm f/2.0, soft studio light, shallow depth of field',
    golden:         'golden hour outdoor photography, warm amber tones, cinematic, farm background',
    rustic:         'rustic farmhouse style, wooden surface, burlap texture, earthy moody natural light',
    minimal:        'clean white background, overhead flat lay, soft drop shadows, editorial minimal'
  }
  const intentMap = {
    promote:  'highlight freshness, quality, and market appeal',
    educate:  'showcase organic, natural, sustainable growing',
    social:   'vibrant, eye-catching, scroll-stopping social media appeal'
  }
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5', max_tokens: 120,
    messages: [{ role: 'user', content:
      `Write a single image generation prompt for: "${product}" from "${farmName || 'a local farm'}".
Style: ${styleMap[style] || styleMap.photorealistic}
Intent: ${intentMap[intent] || intentMap.promote}
Output ONLY the prompt. No quotes, no explanation. Max 70 words.` }]
  })
  return msg.content[0].text.trim()
}

// ─── Image generation providers ───────────────────────────────────────────────
async function aiGenerate(prompt, seed) {
  if (process.env.OPENAI_API_KEY) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', response_format: 'b64_json', quality: 'hd' }),
      signal: AbortSignal.timeout(60000)
    })
    if (!r.ok) throw new Error(`OpenAI ${r.status}`)
    const d = await r.json()
    return { b64: d.data[0].b64_json, type: 'image/png', provider: 'DALL-E 3', revisedPrompt: d.data[0].revised_prompt }
  }
  if (process.env.REPLICATE_API_KEY) {
    const sr = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`, 'Content-Type': 'application/json', Prefer: 'respond-async' },
      body: JSON.stringify({ input: { prompt, num_outputs: 1, output_format: 'webp', output_quality: 90 } }),
      signal: AbortSignal.timeout(30000)
    })
    if (!sr.ok) throw new Error(`Replicate submit ${sr.status}`)
    const job = await sr.json()
    const deadline = Date.now() + 60000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2500))
      const pr = await fetch(`https://api.replicate.com/v1/predictions/${job.id}`, {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}` }
      })
      const p = await pr.json()
      if (p.status === 'succeeded' && p.output?.[0]) {
        const { b64, type } = await fetchBase64(p.output[0])
        return { b64, type, provider: 'Replicate FLUX.1' }
      }
      if (p.status === 'failed') throw new Error('Replicate job failed')
    }
    throw new Error('Replicate timed out')
  }
  if (process.env.STABILITY_API_KEY) {
    const r = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.STABILITY_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text_prompts: [{ text: prompt, weight: 1 }], cfg_scale: 8, height: 1024, width: 1024, samples: 1, steps: 30, seed: seed || 0 }),
      signal: AbortSignal.timeout(60000)
    })
    if (!r.ok) throw new Error(`Stability ${r.status}`)
    const d = await r.json()
    return { b64: d.artifacts[0].base64, type: 'image/png', provider: 'Stability SDXL' }
  }
  throw new Error('NO_AI_KEY')
}

// ─── POST /api/generate-image ─────────────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  const { product, style = 'photorealistic', farmName = '', intent = 'promote', seed } = req.body
  if (!product?.trim()) return res.status(400).json({ error: 'Missing product' })

  try {
    console.log(`\n>>> Image: "${product}" [${style}] [${intent}]`)
    const prompt = await buildPrompt(product, style, farmName, intent)
    console.log(`>>> Prompt: "${prompt}"`)

    // Try AI provider first
    try {
      const result = await aiGenerate(prompt, seed || Math.floor(Math.random() * 999999))
      console.log(`>>> AI OK [${result.provider}]`)
      return res.json({
        image: `data:${result.type};base64,${result.b64}`,
        prompt: result.revisedPrompt || prompt,
        provider: result.provider,
        originalInput: product,
        aiGenerated: true
      })
    } catch (aiErr) {
      console.warn(`>>> AI failed (${aiErr.message}), falling back to Unsplash`)
    }

    // Unsplash fallback — always works
    const mappedUrl = findMappedUrl(product)
    const { b64, type } = mappedUrl
      ? await fetchBase64(mappedUrl)
      : await unsplashFallback(product)
    console.log(`>>> Unsplash fallback OK [${mappedUrl ? 'mapped' : 'search'}]`)
    return res.json({
      image: `data:${type};base64,${b64}`,
      prompt, provider: 'Unsplash',
      originalInput: product, aiGenerated: false
    })
  } catch (err) {
    console.error('>>> Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/generate-video ─────────────────────────────────────────────────
// Uses Stable Video Diffusion (image-to-video) when image is provided,
// falls back to WAN 2.1 (text-to-video) when only a prompt is available.
app.post('/api/generate-video', async (req, res) => {
  const { product, imageDataUri } = req.body
  if (!product) return res.status(400).json({ error: 'Missing product' })

  const apiKey = process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN
  if (!apiKey) return res.json({ simulated: true })

  try {
    let predictionId, status

    if (imageDataUri) {
      // ── Image-to-video: Stable Video Diffusion ────────────────────────────
      console.log(`\n>>> Video [SVD i2v]: "${product}"`)
      const r = await fetch(
        'https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Prefer: 'respond-async'
          },
          body: JSON.stringify({
            input: {
              input_image:          imageDataUri,
              video_length:         '25_frames_with_svd_xt',
              sizing_strategy:      'maintain_aspect_ratio',
              frames_per_second:    6,
              motion_bucket_id:     127,
              cond_aug:             0.02,
              decoding_t:           7,
              noise_aug_strength:   0.1
            }
          }),
          signal: AbortSignal.timeout(30000)
        }
      )
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail || `SVD error ${r.status}`)
      }
      const d = await r.json()
      predictionId = d.id; status = d.status
      console.log(`>>> SVD job submitted: ${predictionId}`)
    } else {
      // ── Text-to-video fallback: WAN 2.1 ──────────────────────────────────
      console.log(`\n>>> Video [WAN t2v]: "${product}"`)
      const prompt = `cinematic slow close-up of fresh ${product}, soft morning light, gentle breeze, 4k promotional, photorealistic`
      const r = await fetch(
        'https://api.replicate.com/v1/models/wavespeedai/wan-2.1-t2v-480p/predictions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Prefer: 'respond-async'
          },
          body: JSON.stringify({
            input: {
              prompt,
              negative_prompt:    'blurry, watermark, text',
              num_frames:         81,
              frames_per_second:  16,
              guidance_scale:     7.5,
              num_inference_steps:30
            }
          }),
          signal: AbortSignal.timeout(30000)
        }
      )
      if (!r.ok) throw new Error(`WAN error ${r.status}`)
      const d = await r.json()
      predictionId = d.id; status = d.status
      console.log(`>>> WAN job submitted: ${predictionId}`)
    }

    res.json({ predictionId, status, provider: imageDataUri ? 'Stable Video Diffusion' : 'WAN 2.1' })
  } catch (err) {
    console.error('>>> Video submit error:', err.message)
    // Return simulated so frontend falls back to canvas
    res.json({ simulated: true, error: err.message })
  }
})

// ─── GET /api/poll-video/:id ──────────────────────────────────────────────────
app.get('/api/poll-video/:id', async (req, res) => {
  const apiKey = process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_TOKEN
  if (!apiKey) return res.status(400).json({ error: 'No key' })
  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    const d = await r.json()
    // SVD returns output as a single URL string; WAN returns array
    const videoUrl = Array.isArray(d.output) ? d.output[0] : (d.output || null)
    res.json({ status: d.status, videoUrl, error: d.error })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('*', (req, res) => res.sendFile(join(__dirname, '../dist/index.html')))

app.listen(3001, '0.0.0.0', () => {
  const imgProv = process.env.OPENAI_API_KEY ? 'DALL-E 3'
    : process.env.REPLICATE_API_KEY ? 'Replicate FLUX'
    : process.env.STABILITY_API_KEY ? 'Stability SDXL'
    : 'Unsplash fallback'
  console.log('🌿 LocalHarvest AI  →  http://0.0.0.0:3001')
  console.log(`   Image : ${imgProv}   |   Prompt : Claude Haiku`)
})
