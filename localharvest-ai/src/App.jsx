import { useState, useEffect, useRef } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const INTENTS = [
  { id: 'promote',  icon: '🚀', label: 'Promote Product' },
  { id: 'educate',  icon: '📚', label: 'Educate Customers' },
  { id: 'social',   icon: '📱', label: 'Social Media Post' },
]

const INTENT_MESSAGES = {
  promote: 'Fresh • Organic • Ready for you',
  educate: 'Did you know? Grown naturally without chemicals',
  social:  'Harvested today • Limited stock',
}

const STYLES = [
  { id: 'photorealistic', label: '📸 Photorealistic' },
  { id: 'golden',         label: '🌅 Golden Hour' },
  { id: 'rustic',         label: '🌾 Rustic' },
  { id: 'minimal',        label: '✨ Minimal' },
]

const SUGGESTIONS = ['Fresh Tomatoes', 'Heirloom Carrots', 'Wildflower Honey', 'Purple Basil', 'Free-Range Eggs', 'Strawberries']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Web Audio: ambient farm music ────────────────────────────────────────────
function createAmbientMusic(audioCtx, destination, duration = 7) {
  const notes = [261.63, 329.63, 392.00, 493.88, 523.25] // C maj pentatonic
  notes.forEach((freq, i) => {
    const osc  = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const filt = audioCtx.createBiquadFilter()
    filt.type = 'lowpass'; filt.frequency.value = 800
    osc.type = 'sine'; osc.frequency.value = freq
    osc.connect(filt); filt.connect(gain); gain.connect(destination)
    const t0 = audioCtx.currentTime + i * 0.4
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.035, t0 + 0.6)
    gain.gain.linearRampToValueAtTime(0.035, t0 + duration - 1)
    gain.gain.linearRampToValueAtTime(0, t0 + duration)
    osc.start(t0); osc.stop(t0 + duration)
    // sub-octave layer
    const sub = audioCtx.createOscillator()
    const subGain = audioCtx.createGain()
    sub.type = 'sine'; sub.frequency.value = freq / 2
    sub.connect(subGain); subGain.connect(destination)
    subGain.gain.setValueAtTime(0, t0)
    subGain.gain.linearRampToValueAtTime(0.015, t0 + 0.8)
    subGain.gain.linearRampToValueAtTime(0, t0 + duration)
    sub.start(t0); sub.stop(t0 + duration)
  })
}

// ─── Canvas video with overlays + audio ──────────────────────────────────────
async function createPromoVideo(imageDataUrl, { productName, farmName, intent }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      const W = 1280, H = 720
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')

      // Audio setup
      let audioTracks = []
      try {
        const audioCtx = new AudioContext()
        const dest = audioCtx.createMediaStreamDestination()
        createAmbientMusic(audioCtx, dest, 7)
        audioTracks = dest.stream.getAudioTracks()
      } catch (_) { /* no audio fallback */ }

      const videoStream  = canvas.captureStream(30)
      const combined     = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks])
      const mimeType     = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'
      const recorder     = new MediaRecorder(combined, { mimeType })
      const chunks = []
      recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)
      recorder.onstop = () => resolve(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })))
      recorder.onerror = reject
      recorder.start()

      const duration = 6500
      const start = performance.now()
      const message = INTENT_MESSAGES[intent] || INTENT_MESSAGES.promote

      // Helper: rounded rect
      function roundRect(x, y, w, h, r) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
      }

      // Helper: fade alpha
      const fadeIn = (t, from, to) => Math.max(0, Math.min(1, (t - from) / (to - from)))
      const fadeOut = (t, from, to) => 1 - fadeIn(t, from, to)

      function draw(now) {
        const elapsed = now - start
        const t = Math.min(elapsed / duration, 1)

        ctx.clearRect(0, 0, W, H)

        // Ken Burns: zoom + subtle pan
        const scale = 1 + t * 0.16
        const panX = t * 40
        const panY = t * 15
        ctx.save()
        ctx.translate(W / 2 + panX, H / 2 + panY)
        ctx.scale(scale, scale)
        ctx.drawImage(img, -W / 2, -H / 2, W, H)
        ctx.restore()

        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85)
        vig.addColorStop(0, 'rgba(0,0,0,0)')
        vig.addColorStop(1, 'rgba(0,0,0,0.55)')
        ctx.fillStyle = vig
        ctx.fillRect(0, 0, W, H)

        // Bottom gradient bar
        const bar = ctx.createLinearGradient(0, H - 200, 0, H)
        bar.addColorStop(0, 'rgba(0,0,0,0)')
        bar.addColorStop(1, 'rgba(0,20,0,0.85)')
        ctx.fillStyle = bar
        ctx.fillRect(0, H - 200, W, 200)

        const sec = elapsed / 1000

        // 1. Farm name badge — appears at 0.8s
        const a1 = fadeIn(sec, 0.8, 1.5)
        if (a1 > 0) {
          ctx.globalAlpha = a1
          const badge = `🌿 ${farmName || 'Local Farm'}`
          ctx.font = '600 15px Inter, sans-serif'
          const bw = ctx.measureText(badge).width + 28
          ctx.fillStyle = 'rgba(0,80,30,0.85)'
          roundRect(44, 36, bw, 34, 17)
          ctx.fill()
          ctx.fillStyle = '#4ade80'
          ctx.fillText(badge, 58, 58)
          ctx.globalAlpha = 1
        }

        // 2. Product name — appears at 1.5s
        const a2 = fadeIn(sec, 1.5, 2.3)
        if (a2 > 0) {
          ctx.globalAlpha = a2
          ctx.font = 'bold 56px "Playfair Display", Georgia, serif'
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = 'rgba(0,0,0,0.6)'
          ctx.shadowBlur = 12
          ctx.fillText(productName || '', 48, H - 120)
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        }

        // 3. "From [farm]" — appears at 2.4s
        const a3 = fadeIn(sec, 2.4, 3.1)
        if (a3 > 0) {
          ctx.globalAlpha = a3
          ctx.font = '500 20px Inter, sans-serif'
          ctx.fillStyle = '#a8e6a3'
          ctx.fillText(`From ${farmName || 'our local farm'}`, 50, H - 82)
          ctx.globalAlpha = 1
        }

        // 4. Dynamic message — appears at 3.2s
        const a4 = fadeIn(sec, 3.2, 4.0)
        if (a4 > 0) {
          ctx.globalAlpha = a4 * 0.85
          ctx.font = '400 16px Inter, sans-serif'
          ctx.fillStyle = '#d1fae5'
          // draw dots between phrases
          ctx.fillText(message, 50, H - 52)
          ctx.globalAlpha = 1
        }

        // 5. CTA button — appears at 4.2s, slight pulse
        const a5 = fadeIn(sec, 4.2, 5.0)
        if (a5 > 0) {
          const pulse = 1 + Math.sin(elapsed / 400) * 0.03
          ctx.globalAlpha = a5
          ctx.save()
          ctx.translate(W - 80, H - 68)
          ctx.scale(pulse, pulse)
          roundRect(-90, -22, 180, 44, 22)
          ctx.fillStyle = '#00a854'
          ctx.fill()
          ctx.font = 'bold 16px Inter, sans-serif'
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.fillText('Order Now →', 0, 6)
          ctx.textAlign = 'left'
          ctx.restore()
          ctx.globalAlpha = 1
        }

        // Fade out last 0.4s
        if (t > 0.92) {
          ctx.globalAlpha = fadeOut(t, 0.92, 1.0)
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, W, H)
          ctx.globalAlpha = 1
        }

        if (t < 1) requestAnimationFrame(draw)
        else recorder.stop()
      }

      requestAnimationFrame(draw)
    }
    img.onerror = reject
    img.src = imageDataUrl
  })
}

// ─── UI primitives ────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = '#4ade80' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, flexShrink: 0,
      border: `2.5px solid rgba(255,255,255,0.1)`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite'
    }} />
  )
}

function Skeleton({ height, borderRadius = 14 }) {
  return (
    <div style={{
      width: '100%', height, borderRadius,
      background: 'linear-gradient(90deg, #101910 25%, #1a2a1a 50%, #101910 75%)',
      backgroundSize: '600px 100%', animation: 'shimmer 1.5s infinite'
    }} />
  )
}

function Badge({ label, color = '#4ade80' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: `${color}18`, color, border: `1px solid ${color}28`
    }}>{label}</span>
  )
}

// ─── Download helper ──────────────────────────────────────────────────────────
function downloadFile(src, filename) {
  const a = document.createElement('a')
  a.href = src; a.download = filename; a.click()
}

// ─── Media Card (image or video) ─────────────────────────────────────────────
function MediaCard({ title, badge, badgeColor, children, loading, skeletonH = 380, actions }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid #1a3a1a',
      borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      {/* Card header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid #1a3a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#a0c4a0' }}>{title}</span>
        {badge && <Badge label={badge} color={badgeColor || '#4ade80'} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: loading ? 16 : 0, minHeight: skeletonH }}>
        {loading ? <Skeleton height={skeletonH - 32} /> : children}
      </div>

      {/* Actions */}
      {actions && !loading && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid #1a3a1a', display: 'flex', gap: 8, background: 'rgba(0,0,0,0.15)' }}>
          {actions}
        </div>
      )}
    </div>
  )
}

function GhostBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 14px', borderRadius: 9, border: '1px solid #2a4a2a',
      background: 'transparent', color: disabled ? '#2a4a2a' : '#6b9e6b',
      fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
    }}>{children}</button>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [farmName, setFarmName]     = useState('')
  const [intent, setIntent]         = useState('promote')
  const [style, setStyle]           = useState('photorealistic')
  const [product, setProduct]       = useState('')

  const [imgLoading, setImgLoading]   = useState(false)
  const [vidLoading, setVidLoading]   = useState(false)
  const [vidProvider, setVidProvider] = useState('')
  const [imageData, setImageData]     = useState(null)
  const [videoSrc, setVideoSrc]       = useState(null)
  const [error, setError]             = useState('')

  const debounceRef = useRef(null)
  const pollRef     = useRef(null)

  // ── Generate image ──────────────────────────────────────────────────────────
  async function generateImage(prod, farm, int, sty) {
    if (!prod.trim()) return null
    setImgLoading(true)
    setImageData(null)
    setError('')
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: prod, farmName: farm, intent: int, style: sty, seed: Math.floor(Math.random() * 999999) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image failed')
      setImageData(data)
      return data
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setImgLoading(false)
    }
  }

  // ── Canvas fallback video ────────────────────────────────────────────────────
  async function canvasVideo(imgSrc, prod, farm, int) {
    try {
      const url = await createPromoVideo(imgSrc, { productName: prod, farmName: farm, intent: int })
      setVideoSrc(url)
      setVidProvider('Canvas')
    } catch (e) {
      setError('Video render failed: ' + e.message)
    }
  }

  // ── Real AI video via Replicate (SVD i2v → poll) ──────────────────────────
  async function generateVideo(imgSrc, prod, farm, int) {
    if (!imgSrc) return
    clearTimeout(pollRef.current)
    setVidLoading(true)
    setVideoSrc(null)
    setVidProvider('')

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: prod, imageDataUri: imgSrc })
      })
      const data = await res.json()

      // No Replicate key — fall back to canvas immediately
      if (data.simulated) {
        setVidProvider('Canvas')
        await canvasVideo(imgSrc, prod, farm, int)
        setVidLoading(false)
        return
      }

      setVidProvider(data.provider || 'Replicate')

      // Poll for result
      const { predictionId } = data
      const poll = async () => {
        try {
          const pr = await fetch(`/api/poll-video/${predictionId}`)
          const pd = await pr.json()

          if (pd.status === 'succeeded' && pd.videoUrl) {
            setVideoSrc(pd.videoUrl)
            setVidLoading(false)
          } else if (pd.status === 'failed') {
            console.warn('Replicate failed, falling back to canvas:', pd.error)
            await canvasVideo(imgSrc, prod, farm, int)
            setVidLoading(false)
          } else {
            pollRef.current = setTimeout(poll, 3000)
          }
        } catch (pollErr) {
          await canvasVideo(imgSrc, prod, farm, int)
          setVidLoading(false)
        }
      }
      pollRef.current = setTimeout(poll, 5000)
    } catch (e) {
      // Any error → canvas fallback
      await canvasVideo(imgSrc, prod, farm, int)
      setVidLoading(false)
    }
  }

  // ── Debounced auto-generate ─────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    clearTimeout(pollRef.current)
    if (!product.trim()) return
    debounceRef.current = setTimeout(async () => {
      setVideoSrc(null)
      const imgData = await generateImage(product, farmName, intent, style)
      if (imgData?.image) {
        await generateVideo(imgData.image, product, farmName, intent)
      }
    }, 600)
    return () => { clearTimeout(debounceRef.current); clearTimeout(pollRef.current) }
  }, [product, farmName, intent, style])

  const slug = (product || 'product').toLowerCase().replace(/\s+/g, '-')

  return (
    <div style={{ minHeight: '100vh', background: '#070d07', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Nav ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
        borderBottom: '1px solid #142014', background: 'rgba(7,13,7,0.92)',
        backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#004d28,#4ade80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>🌿</div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700, color: '#e8f5e3' }}>
            LocalHarvest <span style={{ color: '#4ade80' }}>AI</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge label="Image Studio" color="#4ade80" />
          {farmName && <Badge label={farmName} color="#a78bfa" />}
        </div>
      </header>

      <div style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 24px 60px' }}>

        {/* ── Greeting ── */}
        <div className="slide-down" style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, color: '#e8f5e3', marginBottom: 4
          }}>
            {getGreeting()}, <span style={{ color: '#4ade80' }}>{farmName || 'Your Farm'}</span> 🌅
          </h1>
          <p style={{ color: '#3a5a3a', fontSize: 14 }}>Let's create stunning content for your products.</p>
        </div>

        {/* ── Personalization + Controls ── */}
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid #1a3a1a',
          borderRadius: 18, padding: '24px 28px', marginBottom: 28
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 }}>

            {/* Farm name */}
            <div>
              <label style={labelStyle}>Farm Name</label>
              <input
                value={farmName}
                onChange={e => setFarmName(e.target.value)}
                placeholder="e.g. Green Valley Farm"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#4ade80'}
                onBlur={e => e.target.style.borderColor = '#1f3a1f'}
              />
            </div>

            {/* Style */}
            <div>
              <label style={labelStyle}>Photography Style</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${style === s.id ? '#4ade8060' : '#1f3a1f'}`,
                    background: style === s.id ? 'rgba(74,222,128,0.1)' : 'transparent',
                    color: style === s.id ? '#4ade80' : '#4a6a4a'
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Intent */}
          <label style={{ ...labelStyle, marginBottom: 10 }}>What do you want to do today?</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            {INTENTS.map(it => (
              <button key={it.id} onClick={() => setIntent(it.id)} style={{
                padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                border: `1px solid ${intent === it.id ? '#4ade8060' : '#1f3a1f'}`,
                background: intent === it.id ? 'rgba(74,222,128,0.1)' : 'transparent',
                color: intent === it.id ? '#4ade80' : '#4a6a4a',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>{it.icon}</span> {it.label}
                {intent === it.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', marginLeft: 4 }} />}
              </button>
            ))}
          </div>

          {/* Product input */}
          <label style={labelStyle}>Product Name</label>
          <input
            value={product}
            onChange={e => setProduct(e.target.value)}
            placeholder="Start typing a product to auto-generate content…"
            style={{ ...inputStyle, fontSize: 16, padding: '14px 18px' }}
            onFocus={e => e.target.style.borderColor = '#4ade80'}
            onBlur={e => e.target.style.borderColor = '#1f3a1f'}
          />
          {/* Suggestions */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setProduct(s)} style={{
                padding: '4px 12px', borderRadius: 20, border: '1px solid #1f3a1f',
                background: product === s ? 'rgba(74,222,128,0.1)' : 'transparent',
                color: product === s ? '#4ade80' : '#3a5a3a', fontSize: 12, cursor: 'pointer',
                borderColor: product === s ? '#4ade8040' : '#1f3a1f', transition: 'all 0.15s'
              }}>{s}</button>
            ))}
          </div>

          {/* Status bar */}
          {(imgLoading || vidLoading) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid #1f3a1f' }}>
              <Spinner size={14} />
              <span style={{ fontSize: 13, color: '#4a6a4a', animation: 'pulse 1.5s ease infinite' }}>
                {imgLoading
                  ? 'Claude is crafting your prompt · Generating image…'
                  : vidProvider
                    ? `Generating video via ${vidProvider}… (may take 1–2 min)`
                    : 'Starting video generation…'}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#1a0808', border: '1px solid #4a1a1a', borderRadius: 12, padding: '12px 18px', marginBottom: 20, color: '#f87171', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Side-by-side image + video ── */}
        {(product.trim() || imageData || vidLoading) && (
          <div className="fade-up" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
            '@media(max-width:680px)': { gridTemplateColumns: '1fr' }
          }}>

            {/* IMAGE CARD */}
            <MediaCard
              title="AI Generated Image"
              badge={imageData?.aiGenerated ? imageData.provider : imageData ? 'Unsplash' : undefined}
              badgeColor={imageData?.aiGenerated ? '#4ade80' : '#94a3b8'}
              loading={imgLoading}
              skeletonH={420}
              actions={imageData && <>
                <GhostBtn onClick={() => downloadFile(imageData.image, `${slug}-image.png`)}>
                  ⬇ Download Image
                </GhostBtn>
                <GhostBtn onClick={async () => {
                  const d = await generateImage(product, farmName, intent, style)
                  if (d?.image) generateVideo(d.image, product, farmName, intent)
                }}>
                  🔄 Regenerate
                </GhostBtn>
              </>}
            >
              {imageData && (
                <div style={{ position: 'relative' }}>
                  <img src={imageData.image} alt={product} style={{ width: '100%', display: 'block' }} />
                  {/* Prompt on hover */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '36px 14px 12px',
                    background: 'linear-gradient(transparent, rgba(0,10,0,0.8))',
                    fontSize: 11, color: 'rgba(200,230,200,0.7)', lineHeight: 1.5
                  }}>
                    {imageData.prompt?.slice(0, 100)}{imageData.prompt?.length > 100 ? '…' : ''}
                  </div>
                </div>
              )}
            </MediaCard>

            {/* VIDEO CARD */}
            <MediaCard
              title="Promo Video"
              badge={videoSrc ? vidProvider : vidLoading ? `Generating · ${vidProvider || 'Replicate'}…` : undefined}
              badgeColor={vidProvider === 'Canvas' ? '#a78bfa' : '#60a5fa'}
              loading={vidLoading && !videoSrc}
              skeletonH={420}
              actions={videoSrc && <>
                <GhostBtn onClick={() => downloadFile(videoSrc, `${slug}-promo.webm`)}>
                  ⬇ Download Video
                </GhostBtn>
                <GhostBtn onClick={() => imageData && generateVideo(imageData.image, product, farmName, intent)}>
                  🔄 Regenerate
                </GhostBtn>
              </>}
            >
              {videoSrc && (
                <video
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  style={{ width: '100%', display: 'block' }}
                />
              )}
            </MediaCard>
          </div>
        )}

        {/* Empty state */}
        {!product.trim() && !imageData && !imgLoading && (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '2px dashed #162016', borderRadius: 20
          }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌾</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#2a4a2a' }}>Type a product name to begin</p>
            <p style={{ fontSize: 13, color: '#1a3a1a', marginTop: 6 }}>
              Image + personalised video will generate automatically
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#3a5a3a',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8
}
const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #1f3a1f', background: '#0d1a0d',
  color: '#e8f5e3', fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
}
