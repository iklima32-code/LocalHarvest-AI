import { useState, useEffect, useRef } from "react"

const PLATFORMS = [
  { key: "productDescription", label: "Product Description", emoji: "🌿", headerBg: "#059669", headerText: "#fff",  bodyBg: "#f0fdf4", bodyText: "#065f46", border: "#6ee7b7" },
  { key: "facebookPost",       label: "Facebook Post",       emoji: "📘", headerBg: "#1d4ed8", headerText: "#fff",  bodyBg: "#eff6ff", bodyText: "#1e3a8a", border: "#93c5fd" },
  { key: "linkedInPost",       label: "LinkedIn Post",       emoji: "💼", headerBg: "#0369a1", headerText: "#fff",  bodyBg: "#f0f9ff", bodyText: "#0c4a6e", border: "#7dd3fc" },
  { key: "instagramCaption",   label: "Instagram Caption",   emoji: "📸", headerBg: "#9333ea", headerText: "#fff",  bodyBg: "#fdf4ff", bodyText: "#581c87", border: "#d8b4fe" },
  { key: "tiktokHook",         label: "TikTok Hook",         emoji: "🎬", headerBg: "#111827", headerText: "#fff",  bodyBg: "#f9fafb", bodyText: "#111827", border: "#d1d5db" },
  { key: "reelScript",         label: "Reel Script",         emoji: "🎥", headerBg: "#7c3aed", headerText: "#fff",  bodyBg: "#f5f3ff", bodyText: "#4c1d95", border: "#c4b5fd" },
  { key: "hashtags",           label: "Hashtags",            emoji: "🏷️", headerBg: "#d97706", headerText: "#fff",  bodyBg: "#fffbeb", bodyText: "#92400e", border: "#fcd34d" },
]

const STEPS = [
  { label: "AI analysing your harvest",            done: false },
  { label: "Detecting produce",                    done: false },
  { label: "Understanding colour and freshness",   done: false },
  { label: "Generating social media content",      done: false },
]

/* ── Copy Button ─────────────────────────────────────────── */
function CopyButton({ text }) {
  const [state, setState] = useState("idle") // idle | copied

  const doWrite = (str) => {
    const finish = () => { setState("copied"); setTimeout(() => setState("idle"), 2000) }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(str).then(finish).catch(() => execCopy(str, finish))
    } else {
      execCopy(str, finish)
    }
  }
  const execCopy = (str, cb) => {
    const ta = document.createElement("textarea")
    ta.value = str
    ta.style.cssText = "position:fixed;opacity:0"
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
    cb()
  }

  const handleClick = () => {
    const str = Array.isArray(text) ? text.map(h => `#${h}`).join(" ") : text
    doWrite(str)
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      {state === "copied" && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0,
          background: "#1f2937", color: "#fff", fontSize: "11px", fontWeight: 600,
          padding: "4px 10px", borderRadius: "8px", whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 10,
          animation: "fadeInUp .2s ease"
        }}>
          Copied ✓
        </span>
      )}
      <button
        onClick={handleClick}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          border: "1.5px solid rgba(255,255,255,0.4)", cursor: "pointer",
          background: state === "copied" ? "#dcfce7" : "rgba(255,255,255,0.15)",
          color: state === "copied" ? "#166534" : "#fff",
          transition: "all .2s",
        }}
      >
        {state === "copied" ? "✓ Copied!" : "📋 Copy"}
      </button>
    </div>
  )
}

/* ── Loading Panel ───────────────────────────────────────── */
function LoadingPanel() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1600)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      background: "#fff", borderRadius: 24, border: "1px solid #e5e7eb",
      boxShadow: "0 8px 32px rgba(0,0,0,0.08)", padding: "36px 32px", marginBottom: 24,
    }}>
      {/* Spinner + title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "3px solid #e5e7eb", borderTopColor: "#16a34a",
          animation: "spin-slow 0.9s linear infinite", flexShrink: 0,
        }}/>
        <span style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>Claude AI is working its magic…</span>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: 380, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {STEPS.map((s, i) => {
          const done    = i < step
          const active  = i === step
          const pending = i > step
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: pending ? 0.35 : 1, transition: "opacity .4s" }}>
              {/* Icon */}
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#16a34a" : active ? "#dcfce7" : "#f3f4f6",
                border: `2px solid ${done ? "#16a34a" : active ? "#16a34a" : "#d1d5db"}`,
                transition: "all .4s",
              }}>
                {done
                  ? <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>
                  : active
                  ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", animation: "spin-slow 1s linear infinite" }}/>
                  : null}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: pending ? "#9ca3af" : "#374151" }}>{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* Skeleton cards */}
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        {[0.9, 0.7, 0.5].map((op, i) => (
          <div key={i} style={{ background: "#f9fafb", borderRadius: 14, border: "1px solid #f3f4f6", padding: "14px 16px", opacity: op }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e5e7eb", animation: "shimmer 1.4s infinite" }}/>
              <div style={{ width: 110, height: 11, borderRadius: 6, background: "#e5e7eb", animation: "shimmer 1.4s infinite" }}/>
            </div>
            <div style={{ width: "100%", height: 9, borderRadius: 5, background: "#e5e7eb", marginBottom: 7, animation: "shimmer 1.4s infinite" }}/>
            <div style={{ width: "75%",  height: 9, borderRadius: 5, background: "#e5e7eb", animation: "shimmer 1.4s infinite" }}/>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────── */
export default function PhotoContentGenerator() {
  const [preview,  setPreview]  = useState(null)
  const [imgFile,  setImgFile]  = useState(null)
  const [produce,  setProduce]  = useState("")
  const [farm,     setFarm]     = useState("")
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const [badge,    setBadge]    = useState(null)   // { produce, farm }
  const fileRef = useRef(null)

  useEffect(() => { if (imgFile) generateContentWithFile(imgFile) }, [imgFile])

  const toBase64 = f => new Promise((res, rej) => {
    const r = new FileReader()
    r.readAsDataURL(f)
    r.onload  = () => res(r.result.split(",")[1])
    r.onerror = rej
  })

  const handleFile = f => {
    if (!f || !f.type.startsWith("image/")) return
    setImgFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setBadge(null)
  }

  const onDrop = e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }

  const generateContentWithFile = async file => {
    setLoading(true); setError(null); setResult(null); setBadge(null)
    try {
      const imageBase64    = file ? await toBase64(file) : null
      const imageMediaType = file?.type || "image/jpeg"
      const res  = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produceName: produce, farmName: farm, imageBase64, imageMediaType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Server error")
      setResult(data)
      setBadge({ produce: produce || data.detectedProduce || "Fresh Produce", farm })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const fmtValue = (key, val) =>
    key === "hashtags" && Array.isArray(val) ? val.map(h => `#${h}`).join("  ") : val

  const downloadKit = () => {
    if (!result) return
    const lines = [
      "═══════════════════════════════════════",
      "    LOCALHARVEST AI — MARKETING KIT",
      "═══════════════════════════════════════\n",
      ...PLATFORMS.map(p => result[p.key]
        ? [`${p.emoji} ${p.label.toUpperCase()}`, "─".repeat(36), fmtValue(p.key, result[p.key]), ""]
        : []
      ).flat(),
      `Generated by LocalHarvest AI · ${new Date().toLocaleDateString()}`,
    ]
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }))
    a.download = `${(badge?.produce || "harvest").replace(/\s+/g,"-").toLowerCase()}-marketing-kit.txt`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const startOver = () => {
    setResult(null); setPreview(null); setImgFile(null)
    setProduce(""); setFarm(""); setError(null); setBadge(null)
  }

  /* ── styles (inline so Tailwind purging can't bite us) ── */
  const card = { background: "#fff", borderRadius: 24, border: "1px solid #f3f4f6", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 16 }
  const input = { width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 40px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#f9fafb", fontSize: 14, outline: "none", transition: "border .2s" }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* ── Hero ───────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg,#14532d 0%,#166534 50%,#0f766e 100%)", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 64px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "5px 14px", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            🍃 Powered by Claude AI
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(36px,6vw,58px)", fontWeight: 800, margin: "0 0 14px", lineHeight: 1.1 }}>
            LocalHarvest <span style={{ color: "#86efac" }}>AI</span>
          </h1>
          <p style={{ fontSize: 18, color: "#bbf7d0", maxWidth: 480, margin: "0 auto 28px", fontWeight: 300, lineHeight: 1.6 }}>
            Upload a farm photo — get a full marketing kit for every platform in seconds.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {["📘 Facebook","💼 LinkedIn","📸 Instagram","🎬 TikTok","🎥 Reels"].map(p => (
              <span key={p} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 500 }}>{p}</span>
            ))}
          </div>
        </div>
        {/* wave */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(to bottom right, #f0fdf4, #ecfdf5, #f0fdfa)", clipPath: "ellipse(55% 100% at 50% 100%)" }}/>
      </div>

      {/* ── Main ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* Upload card */}
        <div style={card}>

          {/* Drop zone */}
          <div
            onClick={() => !loading && fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              cursor: loading ? "default" : "pointer",
              background: dragging ? "#f0fdf4" : "transparent",
              outline: dragging ? "2px solid #16a34a" : "none",
              outlineOffset: -2,
              transition: "all .2s",
            }}
          >
            {preview ? (
              <div style={{ position: "relative" }} className="group">
                <img src={preview} alt="Uploaded produce" style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }}/>
                {!loading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.38)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}
                  >
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, background: "rgba(0,0,0,0.3)", padding: "8px 18px", borderRadius: 12, backdropFilter: "blur(4px)" }}>
                      📷 Change Photo
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 24px", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg,#dcfce7,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16, transform: dragging ? "scale(1.1)" : "scale(1)", transition: "transform .2s" }}>
                  📷
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Drop your farm photo here</p>
                <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 8px" }}>or <span style={{ color: "#16a34a", fontWeight: 600, textDecoration: "underline" }}>browse to upload</span></p>
                <p style={{ fontSize: 12, color: "#d1d5db" }}>JPG · PNG · WEBP — content generates automatically on upload</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }}/>
          </div>

          {/* AI detected badge */}
          {badge && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 20px 4px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: "1px solid #86efac" }}>
                🤖 AI detected: {badge.produce}
              </span>
              {badge.farm && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 999, border: "1px solid #fcd34d" }}>
                  🏡 {badge.farm}
                </span>
              )}
            </div>
          )}

          {/* Inputs + button */}
          <div style={{ padding: "16px 20px 20px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { emoji: "🥕", placeholder: "Produce name (AI detects if blank)", val: produce, set: setProduce },
                { emoji: "🏡", placeholder: "Farm name",                           val: farm,    set: setFarm    },
              ].map(f => (
                <div key={f.placeholder} style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>{f.emoji}</span>
                  <input
                    placeholder={f.placeholder}
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    onFocus={e  => e.target.style.borderColor = "#16a34a"}
                    onBlur={e   => e.target.style.borderColor = "#e5e7eb"}
                    style={input}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => generateContentWithFile(imgFile)}
              disabled={loading}
              style={{
                width: "100%", padding: "15px 24px", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#6ee7b7" : "linear-gradient(135deg,#16a34a,#059669)",
                color: "#fff", fontWeight: 800, fontSize: 16,
                boxShadow: loading ? "none" : "0 6px 20px rgba(22,163,74,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all .2s",
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin-slow .8s linear infinite" }}/>
                  Generating your marketing kit…
                </>
              ) : "✨ Generate Marketing Kit"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 16, padding: "14px 18px", marginBottom: 20, color: "#991b1b", fontSize: 14, fontWeight: 500 }}>
            ⚠️ <span>{error}</span>
          </div>
        )}

        {/* Loading panel */}
        {loading && <LoadingPanel/>}

        {/* Results */}
        {result && !loading && (
          <div>
            {/* Ready banner */}
            <div style={{ background: "linear-gradient(135deg,#16a34a,#059669)", borderRadius: 20, padding: "16px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 6px 20px rgba(22,163,74,0.3)", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✅</div>
                <div>
                  <p style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 15 }}>Your marketing kit is ready!</p>
                  <p style={{ margin: 0, color: "#bbf7d0", fontSize: 12 }}>{PLATFORMS.length} content pieces generated</p>
                </div>
              </div>
              <button
                onClick={downloadKit}
                style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", color: "#166534", border: "none", borderRadius: 12, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
              >
                ⬇ Download Kit
              </button>
            </div>

            {/* Content cards */}
            {PLATFORMS.map((p, i) => result[p.key] && (
              <div key={p.key} style={{ ...card, animationDelay: `${i * 60}ms`, animation: "fadeInUp .4s ease both" }}>
                <div style={{ background: p.headerBg, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: p.headerText }}>
                    <span style={{ fontSize: 20 }}>{p.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.02em" }}>{p.label}</span>
                  </div>
                  <CopyButton text={result[p.key]}/>
                </div>
                <div style={{ background: p.bodyBg, padding: "18px 20px" }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: p.bodyText, whiteSpace: "pre-line" }}>
                    {fmtValue(p.key, result[p.key])}
                  </p>
                </div>
              </div>
            ))}

            {/* Bottom actions */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 32 }}>
              <button
                onClick={downloadKit}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#16a34a,#059669)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(22,163,74,0.3)" }}
              >
                ⬇ Download Marketing Kit
              </button>
              <button
                onClick={startOver}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 14, border: "2px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                ↩ Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
