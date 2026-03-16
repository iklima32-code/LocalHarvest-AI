import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const app = express()
const port = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.post('/api/generate-content', async (req, res) => {
  const { produceName, farmName, tone, imageBase64, imageMediaType } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  const textPrompt = `You are a farm marketing expert. A farmer has uploaded a photo of their produce.

Produce: ${produceName || 'fresh produce'}
Farm: ${farmName || 'Our Farm'}
Tone: ${tone || 'friendly'}

Analyze the photo and generate 5 pieces of marketing content. Respond with ONLY valid JSON — no markdown fences, no extra text — in exactly this shape:
{
  "productDescription": "2-3 sentences with vivid sensory detail, suitable for a market listing or online store",
  "facebookPost": "100-150 words, conversational, 2-3 relevant emojis, ends with a call-to-action, hashtags included inline at end",
  "linkedInPost": "150-200 words, professional tone highlighting farm business or sustainability, single opener emoji only",
  "hashtags": ["FarmFresh", "LocalFood"],
  "videoScript": "30-second promotional video script using [SCENE], [VOICEOVER], [TEXT OVERLAY] markers, 3-4 scenes, punchy lines"
}

The hashtags array should contain 8-10 items WITHOUT the # symbol.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType || 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: textPrompt
            }
          ]
        }
      ]
    })

    const raw = message.content[0].text
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim()
    const data = JSON.parse(cleaned)
    res.json(data)
  } catch (err) {
    console.error('Claude API error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`LocalHarvest AI API server running on http://localhost:${port}`)
})