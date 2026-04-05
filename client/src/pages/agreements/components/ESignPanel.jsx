import { useRef, useState, useEffect, useCallback } from 'react'
import { PenTool, Type, Upload, Trash2, Check, X } from 'lucide-react'

const TABS = [
  { id: 'draw',   label: 'Draw',   icon: PenTool },
  { id: 'type',   label: 'Type',   icon: Type },
  { id: 'upload', label: 'Upload', icon: Upload },
]

// ── Draw signature canvas ─────────────────────────────────────────────────
function DrawTab({ onConfirm, onCancel }) {
  const canvasRef   = useRef(null)
  const drawing     = useRef(false)
  const lastPos     = useRef({ x: 0, y: 0 })
  const [isEmpty, setIsEmpty] = useState(true)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  const startDraw = useCallback((e) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    lastPos.current = getPos(e, canvas)
  }, [])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
    setIsEmpty(false)
  }, [])

  const endDraw = useCallback(() => { drawing.current = false }, [])

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const confirm = () => {
    const canvas = canvasRef.current
    onConfirm(canvas.toDataURL('image/png'))
  }

  // Draw guide line
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(20, 110)
    ctx.lineTo(canvas.width - 20, 110)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#d1d5db'
    ctx.fillText('Sign here', 24, 105)
  }, [])

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={520}
        height={140}
        className="w-full rounded-xl border touch-none cursor-crosshair"
        style={{ background: 'white', border: '1px solid var(--border)' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex gap-2">
        <button onClick={clear} className="btn-ghost flex-1 justify-center gap-1.5 text-sm">
          <Trash2 size={13} /> Clear
        </button>
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center text-sm">
          <X size={13} /> Cancel
        </button>
        <button onClick={confirm} disabled={isEmpty} className="btn-primary flex-1 justify-center gap-1.5 text-sm"
          style={{ opacity: isEmpty ? 0.5 : 1 }}>
          <Check size={13} /> Confirm
        </button>
      </div>
    </div>
  )
}

// ── Type signature ─────────────────────────────────────────────────────────
function TypeTab({ onConfirm, onCancel }) {
  const [name, setName]     = useState('')
  const [fontIdx, setFontIdx] = useState(0)

  const FONTS = [
    { label: 'Cursive',    css: '"Dancing Script", cursive, "Brush Script MT"' },
    { label: 'Handwritten',css: '"Caveat", cursive, "Comic Sans MS"' },
    { label: 'Formal',     css: '"Pinyon Script", cursive, "Lucida Handwriting"' },
  ]

  const confirm = () => {
    // Render name on canvas and return as data URL
    const canvas = document.createElement('canvas')
    canvas.width  = 520
    canvas.height = 140
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = `52px ${FONTS[fontIdx].css}`
    ctx.fillStyle = '#1a1a1a'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 24, 80)
    // Guide line
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(20, 120)
    ctx.lineTo(canvas.width - 20, 120)
    ctx.stroke()
    onConfirm(canvas.toDataURL('image/png'))
  }

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Type your full name..."
        className="input-glass"
        style={{ fontSize: 15 }}
      />
      {/* Font selector */}
      <div className="flex gap-2">
        {FONTS.map((f, i) => (
          <button key={i} onClick={() => setFontIdx(i)}
            className="flex-1 py-2 rounded-xl text-sm transition-all"
            style={{
              fontFamily: f.css,
              background: fontIdx === i ? 'var(--orange-light)' : 'var(--bg-secondary)',
              border: `1px solid ${fontIdx === i ? 'var(--orange)' : 'var(--border)'}`,
              color: fontIdx === i ? 'var(--orange)' : 'var(--text-primary)',
              fontSize: 18,
            }}>
            {name || f.label}
          </button>
        ))}
      </div>
      {/* Preview */}
      {name && (
        <div className="w-full rounded-xl p-4 text-center" style={{ background: 'white', border: '1px solid var(--border)', height: 80 }}>
          <span style={{ fontFamily: FONTS[fontIdx].css, fontSize: 42, color: '#1a1a1a', lineHeight: 1 }}>{name}</span>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center text-sm">
          <X size={13} /> Cancel
        </button>
        <button onClick={confirm} disabled={!name.trim()} className="btn-primary flex-1 justify-center gap-1.5 text-sm"
          style={{ opacity: !name.trim() ? 0.5 : 1 }}>
          <Check size={13} /> Confirm
        </button>
      </div>
    </div>
  )
}

// ── Upload signature ───────────────────────────────────────────────────────
function UploadTab({ onConfirm, onCancel }) {
  const [preview, setPreview] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer transition-all hover:bg-white/5"
        style={{ height: 100, border: '2px dashed var(--border)', background: 'var(--bg-secondary)' }}>
        <Upload size={20} className="mb-1" style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Click to upload signature image (PNG, JPG)</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {preview && (
        <div className="w-full rounded-xl p-3 text-center" style={{ background: 'white', border: '1px solid var(--border)' }}>
          <img src={preview} alt="Signature preview" className="max-h-20 mx-auto" />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center text-sm">
          <X size={13} /> Cancel
        </button>
        <button onClick={() => onConfirm(preview)} disabled={!preview} className="btn-primary flex-1 justify-center gap-1.5 text-sm"
          style={{ opacity: !preview ? 0.5 : 1 }}>
          <Check size={13} /> Confirm
        </button>
      </div>
    </div>
  )
}

// ── Main ESignPanel ────────────────────────────────────────────────────────
export default function ESignPanel({ signerLabel = 'Sign here', onSign, onCancel }) {
  const [tab, setTab] = useState('draw')

  const handleConfirm = (dataUrl) => {
    onSign(dataUrl, tab) // data URL + method
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {signerLabel}
      </p>
      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? 'var(--bg-glass)' : 'transparent',
                color: tab === t.id ? 'var(--orange)' : 'var(--text-muted)',
              }}>
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'draw'   && <DrawTab   onConfirm={handleConfirm} onCancel={onCancel} />}
      {tab === 'type'   && <TypeTab   onConfirm={handleConfirm} onCancel={onCancel} />}
      {tab === 'upload' && <UploadTab onConfirm={handleConfirm} onCancel={onCancel} />}
    </div>
  )
}
