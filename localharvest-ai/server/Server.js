const express = require('express')
const cors = require('cors')

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const app = express()
const port = 3000

app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }))
app.use(express.json({ limit: '20mb' }))

app.post('/generate', async (req, res) => {
  const { produceName, farmName, tone, imageBase64, imageMediaType } = req.body

  const promptText = `You are a farm marketing expert helping small local farmers promote their produce.
${imageBase64 ? 'Analyse the photo of the produce and use what you see to inform all content.' : ''}
Produce: ${produceName || 'identify from the photo'}
Farm: ${farmName || 'Our Farm'}
Tone: ${tone || 'friendly and warm'}

Generate marketing content. Respond with ONLY valid JSON — no markdown fences, no extra text — in exactly this shape:
{
  "detectedProduce": "the name of the produce you identified (e.g. Sweet Corn, Cherry Tomatoes)",
  "productDescription": "2-3 sentences with vivid sensory detail based on what you see, suitable for a market listing",
  "facebookPost": "100-150 words, conversational, 2-3 relevant emojis, ends with a call-to-action, hashtags inline at end",
  "linkedInPost": "150-200 words, professional tone highlighting farm business or sustainability, single opener emoji only",
  "instagramCaption": "Short punchy caption under 100 words with emojis and hashtags at end",
  "tiktokHook": "A single attention-grabbing opening line under 15 words for a TikTok video",
  "reelScript": "30-second Reel/TikTok script with [SCENE], [VOICEOVER], and [TEXT OVERLAY] markers, 3-4 scenes",
  "hashtags": ["FarmFresh", "LocalFood"]
}

The hashtags array should contain 8-10 items WITHOUT the # symbol.`

  try {
    const Anthropic = require('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const userContent = imageBase64
      ? [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageMediaType || 'image/jpeg',
              data: imageBase64
            }
          },
          { type: 'text', text: promptText }
        ]
      : promptText

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: userContent }]
    })

    const raw = message.content[0].text
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim()
    const data = JSON.parse(cleaned)
    res.json(data)
  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`LocalHarvest AI server running on http://localhost:${port}`)
})
