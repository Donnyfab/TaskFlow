'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { apiUrl } from '@/lib/api-base'

/* ── Theme tokens ──────────────────────────────────────────────────── */
const PALETTE = {
  dark: {
    cardBg:       'rgba(255,255,255,0.03)',
    cardBorder:   'rgba(255,255,255,0.07)',
    cardBgHover:  'rgba(255,255,255,0.05)',
    cardBdHover:  'rgba(255,255,255,0.28)',
    avatarBg:     'rgba(255,255,255,0.1)',
    avatarText:   'rgba(255,255,255,0.6)',
    nameText:     'rgba(255,255,255,0.82)',
    emailText:    'rgba(255,255,255,0.32)',
    hintText:     'rgba(255,255,255,0.2)',
    divider:      'rgba(255,255,255,0.05)',
    btnBg:        'rgba(255,255,255,0.06)',
    btnBorder:    'rgba(255,255,255,0.1)',
    btnText:      'rgba(255,255,255,0.55)',
    dangerBg:     'rgba(255,50,50,0.06)',
    dangerBorder: 'rgba(255,80,80,0.18)',
    dangerText:   'rgba(255,110,110,0.75)',
    errBg:        'rgba(255,50,50,0.07)',
    errBorder:    'rgba(255,80,80,0.15)',
    errText:      'rgba(255,100,100,0.85)',
  },
  light: {
    cardBg:       'rgba(0,0,0,0.02)',
    cardBorder:   'rgba(0,0,0,0.09)',
    cardBgHover:  'rgba(0,0,0,0.04)',
    cardBdHover:  'rgba(0,0,0,0.22)',
    avatarBg:     'rgba(0,0,0,0.08)',
    avatarText:   'rgba(0,0,0,0.55)',
    nameText:     '#18181b',
    emailText:    'rgba(0,0,0,0.45)',
    hintText:     'rgba(0,0,0,0.38)',
    divider:      'rgba(0,0,0,0.07)',
    btnBg:        'rgba(0,0,0,0.05)',
    btnBorder:    'rgba(0,0,0,0.1)',
    btnText:      'rgba(0,0,0,0.55)',
    dangerBg:     'rgba(220,50,50,0.06)',
    dangerBorder: 'rgba(200,50,50,0.2)',
    dangerText:   '#b03030',
    errBg:        'rgba(220,50,50,0.06)',
    errBorder:    'rgba(200,50,50,0.18)',
    errText:      '#b03030',
  },
}

/* ── Canvas helpers ──────────────────────────────────────────────── */

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

function rotateSize(w: number, h: number, deg: number) {
  const r = (deg * Math.PI) / 180
  return {
    width:  Math.abs(Math.cos(r) * w) + Math.abs(Math.sin(r) * h),
    height: Math.abs(Math.sin(r) * w) + Math.abs(Math.cos(r) * h),
  }
}

async function getCroppedBlob(src: string, pixels: Area, rotation: number): Promise<Blob> {
  const image  = await createImage(src)
  const { width: bw, height: bh } = rotateSize(image.width, image.height, rotation)

  const rotCanvas = document.createElement('canvas')
  rotCanvas.width  = bw
  rotCanvas.height = bh
  const rctx = rotCanvas.getContext('2d')!
  rctx.translate(bw / 2, bh / 2)
  rctx.rotate((rotation * Math.PI) / 180)
  rctx.drawImage(image, -image.width / 2, -image.height / 2)

  const out = document.createElement('canvas')
  out.width  = 400
  out.height = 400
  out.getContext('2d')!.drawImage(
    rotCanvas,
    pixels.x, pixels.y, pixels.width, pixels.height,
    0, 0, 400, 400,
  )

  return new Promise(resolve =>
    out.toBlob(b => resolve(b!), 'image/jpeg', 0.92),
  )
}

/* ── Tiny reusable icon SVGs ─────────────────────────────────────── */

const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const IconUpload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
)

const IconClose = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconRotateLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 109-9H8"/><path d="M3 7v5h5"/>
  </svg>
)

const IconRotateRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 11-9-9h4"/><path d="M21 7v5h-5"/>
  </svg>
)

/* ── Types ───────────────────────────────────────────────────────── */

interface Props {
  profileImage: string | null
  name:         string
  email:        string
  initials:     string
  theme?:       'dark' | 'light'
  onUpload:     (url: string) => void
  onRemove:     () => void
}

/* ── Component ───────────────────────────────────────────────────── */

export default function AvatarUpload({ profileImage, name, email, initials, theme: themeProp, onUpload, onRemove }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [imgSrc,  setImgSrc]  = useState('')
  const [cropOpen, setCropOpen] = useState(false)
  const [crop,    setCrop]    = useState<Point>({ x: 0, y: 0 })
  const [zoom,    setZoom]    = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pixels,  setPixels]  = useState<Area | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [dragOver,  setDragOver]  = useState(false)
  const [hovered,   setHovered]   = useState(false)
  const [err,       setErr]       = useState('')
  const [modalErr,  setModalErr]  = useState('')
  const [detectedTheme, setDetectedTheme] = useState<'dark'|'light'>('dark')

  const onCropComplete = useCallback((_: Area, p: Area) => setPixels(p), [])

  /* Theme detection */
  useEffect(() => {
    const read = () => localStorage.getItem('tf-theme') === 'light' ? 'light' : 'dark' as 'dark'|'light'
    setDetectedTheme(read())
    const onStorage = (e: StorageEvent) => { if (e.key === 'tf-theme') setDetectedTheme(read()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const p = PALETTE[themeProp ?? detectedTheme]

  /* Keyboard: Escape closes modal */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cropOpen && !saving) closeCrop()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cropOpen, saving])

  function processFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('Use JPG, PNG, or WebP.'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr('File too large — max 5 MB.'); return
    }
    setErr('')
    const reader = new FileReader()
    reader.onload = e => {
      setImgSrc(e.target?.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  function closeCrop() {
    if (saving) return
    setCropOpen(false)
    setImgSrc('')
    setModalErr('')
    setProgress(0)
  }

  async function handleSave() {
    if (saving) return
    if (!pixels || !imgSrc) {
      setModalErr('Please wait for the image to load, then try again.')
      return
    }
    setModalErr('')
    setSaving(true)
    setProgress(25)
    try {
      const blob = await getCroppedBlob(imgSrc, pixels, rotation)
      setProgress(50)
      // Convert to base64 data URL — stored directly in DB, survives server restarts
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setProgress(75)
      const res = await fetch(apiUrl('/upload_profile'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64 }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status}${text ? ': ' + text : ''}`)
      }
      const data = await res.json()
      setProgress(100)
      setTimeout(() => {
        closeCrop()
        setSaving(false)
        onUpload(data.url)
      }, 380)
    } catch (e) {
      setSaving(false)
      setProgress(0)
      setModalErr(`Upload failed — ${e instanceof Error ? e.message : 'please try again.'}`)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove your profile photo?')) return
    try {
      const res = await fetch(apiUrl('/remove_profile_image'), { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error()
      onRemove()
    } catch {
      setErr('Failed to remove. Try again.')
    }
  }

  /* ── Styles ──────────────────────────────────────────────────── */

  const card: React.CSSProperties = {
    background:    dragOver ? p.cardBgHover : p.cardBg,
    border:        `1px solid ${dragOver ? p.cardBdHover : p.cardBorder}`,
    borderRadius:  '14px',
    padding:       '20px',
    marginBottom:  '28px',
    transition:    'border-color 0.18s, background 0.18s',
  }

  const ctrlBtn = (danger = false): React.CSSProperties => ({
    background:    danger ? p.dangerBg : p.btnBg,
    border:        `1px solid ${danger ? p.dangerBorder : p.btnBorder}`,
    borderRadius:  '8px',
    padding:       '7px 14px',
    fontSize:      '12px',
    color:         danger ? p.dangerText : p.btnText,
    cursor:        'pointer',
    fontFamily:    'inherit',
    display:       'inline-flex',
    alignItems:    'center',
    gap:           '6px',
    transition:    'all 0.15s',
  })

  const rotBtn: React.CSSProperties = {
    background:   p.btnBg,
    border:       `1px solid ${p.btnBorder}`,
    borderRadius: '8px',
    padding:      '8px 12px',
    color:        p.btnText,
    cursor:       'pointer',
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '6px',
    fontSize:     '12px',
    fontFamily:   'inherit',
    transition:   'all 0.15s',
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Upload card ── */}
      <div
        style={card}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) processFile(f)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          aria-label="Upload profile photo"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) processFile(f)
            e.target.value = ''
          }}
        />

        {/* Avatar + info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>

          {/* Avatar with hover overlay */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Change profile photo"
            style={{ position: 'relative', flexShrink: 0, cursor: 'pointer', borderRadius: '50%' }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Avatar circle */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: p.avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 700, color: p.avatarText,
              overflow: 'hidden',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.2s',
            }}>
              {profileImage
                ? <img src={profileImage.startsWith('data:') ? profileImage : apiUrl(profileImage)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                : initials}
            </div>

            {/* Hover overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.18s',
              pointerEvents: 'none',
            }}>
              <IconCamera/>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Change</span>
            </div>
          </div>

          {/* Name / email / hint */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: p.nameText, marginBottom: '3px' }}>{name}</div>
            <div style={{ fontSize: '12px', color: p.emailText, marginBottom: '6px' }}>{email}</div>
            <div style={{ fontSize: '11px', color: p.hintText }}>JPG, PNG or WebP · Max 5 MB · Drag & drop or click Upload</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${p.divider}`, flexWrap: 'wrap' }}>
          <button style={ctrlBtn()} onClick={() => fileRef.current?.click()}>
            <IconUpload/> Upload Photo
          </button>
          {profileImage && (
            <button style={ctrlBtn(true)} onClick={handleRemove}>
              <IconTrash/> Remove Photo
            </button>
          )}
        </div>

        {/* Inline error */}
        {err && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: p.errText, background: p.errBg, border: `1px solid ${p.errBorder}`, borderRadius: '8px', padding: '8px 12px' }}>
            {err}
          </div>
        )}
      </div>

      {/* ── Crop modal ── */}
      {cropOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile photo"
          onClick={e => { if (e.target === e.currentTarget) closeCrop() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            animation: 'avatarBgIn 0.18s ease',
          }}
        >
          <style>{`
            @keyframes avatarBgIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes avatarModalIn {
              from { opacity: 0; transform: scale(0.93) translateY(14px) }
              to   { opacity: 1; transform: scale(1) translateY(0) }
            }
            .avatar-crop-slider {
              -webkit-appearance: none; appearance: none;
              width: 100%; height: 4px;
              background: rgba(255,255,255,0.12); border-radius: 100px; outline: none;
            }
            .avatar-crop-slider::-webkit-slider-thumb {
              -webkit-appearance: none; appearance: none;
              width: 16px; height: 16px; border-radius: 50%;
              background: #fff; cursor: pointer; border: none;
              box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            }
            .avatar-crop-slider::-moz-range-thumb {
              width: 16px; height: 16px; border-radius: 50%;
              background: #fff; cursor: pointer; border: none;
            }
            .avatar-rot-btn:hover { background: rgba(255,255,255,0.12) !important; color: rgba(255,255,255,0.9) !important; }
            .avatar-ctrl-btn:hover { background: rgba(255,255,255,0.1) !important; color: rgba(255,255,255,0.85) !important; }
          `}</style>

          <div style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            width: 'min(660px, 100%)',
            maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'avatarModalIn 0.22s cubic-bezier(0.34,1.4,0.64,1)',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.3px' }}>Edit Profile Photo</div>
              <button
                onClick={closeCrop}
                aria-label="Close"
                style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              >
                <IconClose/>
              </button>
            </div>

            {/* Cropper area */}
            <div style={{ position: 'relative', height: '340px', flexShrink: 0, background: '#0A0A0A' }}>
              <Cropper
                image={imgSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                style={{
                  containerStyle: { background: '#0A0A0A' },
                  cropAreaStyle: {
                    border: '2px solid rgba(255,255,255,0.7)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  },
                  mediaStyle: {},
                }}
              />
            </div>

            {/* Controls */}
            <div style={{ padding: '18px 22px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>

              {/* Zoom label + slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Zoom</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{zoom.toFixed(1)}×</span>
                </div>
                <input
                  type="range" className="avatar-crop-slider"
                  min={1} max={6} step={0.01}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                />
              </div>

              {/* Rotate buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginRight: '4px' }}>Rotate</span>
                <button className="avatar-rot-btn" style={rotBtn} onClick={() => setRotation(r => r - 90)} aria-label="Rotate left">
                  <IconRotateLeft/> −90°
                </button>
                <button className="avatar-rot-btn" style={rotBtn} onClick={() => setRotation(r => r + 90)} aria-label="Rotate right">
                  <IconRotateRight/> +90°
                </button>
                {rotation !== 0 && (
                  <button className="avatar-rot-btn" style={{ ...rotBtn, color: 'rgba(255,255,255,0.35)', fontSize: '11px' }} onClick={() => setRotation(0)}>
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Error message inside modal */}
            {modalErr && (
              <div style={{ margin: '0 22px', padding: '9px 12px', background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,80,80,0.18)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,120,120,0.9)', flexShrink: 0 }}>
                {modalErr}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

              {/* Progress bar */}
              <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', overflow: 'hidden', opacity: saving ? 1 : 0, transition: 'opacity 0.2s' }}>
                <div style={{ height: '100%', background: 'rgba(255,255,255,0.65)', borderRadius: '100px', width: `${progress}%`, transition: 'width 0.3s ease' }}/>
              </div>

              <button
                className="avatar-ctrl-btn"
                onClick={closeCrop}
                disabled={saving}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '9px 18px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', opacity: saving ? 0.5 : 1, whiteSpace: 'nowrap' }}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: '#fff', border: 'none', borderRadius: '9px', padding: '9px 22px', fontSize: '13px', fontWeight: 600, color: '#0A0A0A', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap' }}
              >
                {saving ? 'Saving…' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
