import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  MessageCircle, Send, RefreshCw, Loader, Search, X,
  Phone, MapPin, Clock, CheckCheck, Settings,
  FileText, CheckSquare, Square,
  Users, Heart, Image as ImageIcon, Video, Music, Paperclip,
  Plus, ArrowLeft, Trash2, Calendar, Eye, AlertCircle,
  LayoutGrid, List, ChevronRight, Bell, Star, ChevronLeft,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import WAChatPanel from './components/WAChatPanel'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

// ── Pagination (CRM Pipeline style) ─────────────────────────────────────────
const PAGE_SIZE = 20

function PaginationBar({ current, total, onChange, from, to, total_count }) {
  const pages = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  const navBtn = (disabled, onClick, label) => (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: disabled ? 'var(--bg-secondary)' : 'var(--bg-card)', color: disabled ? 'var(--text-muted)' : 'var(--text-primary)', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--orange)' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--border)' }}>
      {label}
    </button>
  )

  const pageBtn = (p, i) =>
    p === '...' ? (
      <span key={`e${i}`} style={{ width: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', userSelect: 'none' }}>…</span>
    ) : (
      <button key={p} onClick={() => onChange(p)}
        style={{ width: 30, height: 30, borderRadius: 8, fontSize: 13, fontWeight: p === current ? 700 : 400, border: `1.5px solid ${p === current ? 'var(--orange)' : 'var(--border)'}`, background: p === current ? 'var(--orange)' : 'transparent', color: p === current ? '#fff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => { if (p !== current) { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)' } }}
        onMouseLeave={e => { if (p !== current) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' } }}>
        {p}
      </button>
    )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      {navBtn(current === 1, () => onChange(current - 1), '‹ Previous')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {pages.map((p, i) => pageBtn(p, i))}
      </div>
      {navBtn(current === total || total === 0, () => onChange(current + 1), 'Next ›')}
      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
        {total_count === 0 ? 'No results' : `Showing ${from}–${to} of ${total_count.toLocaleString()} results`}
      </span>
    </div>
  )
}

// ── Followup days config ──────────────────────────────────────────────────────
const FOLLOWUP_DAYS = [2, 4, 6, 8, 12]

const DEFAULT_TEMPLATES = {
  intro: `Hi {name}! 👋 I'm from *StartWeb*. We help businesses like *{name}* grow online with professional websites & digital marketing.\n\nInterested in a *free consultation*? 😊`,
  day2:  `Hi {name}! 😊 Just checking in from StartWeb.\n\nDid you get a chance to look at what we offer? We'd love to help *{name}* grow online!\n\nAny questions? 🙏`,
  day4:  `Hi {name}! 👋 Following up from StartWeb.\n\nWe recently helped businesses in your area get *3x more enquiries* through their website.\n\nWould you like to see how? 🚀`,
  day6:  `Hi {name}! 💼 Deepak here from StartWeb.\n\nWe have a special offer this week — *free website audit* for {name}. Takes just 10 minutes.\n\nInterested? ✅`,
  day8:  `Hi {name}! 🌟 Last few days for our limited offer at StartWeb.\n\nWe'd love to show you what we can do for *{name}*. Can we connect for 5 minutes? 📞`,
  day12: `Hi {name}! This is my last message. If you ever decide to grow *{name}* online, we're here.\n\nWishing you great success! 🚀 — StartWeb Team`,
}

const TEMPLATE_META = {
  intro: { label: 'Intro',    day: null,  color: '#FF6B35', emoji: '👋', badgeColor: 'rgba(255,107,53,0.15)', border: 'rgba(255,107,53,0.3)' },
  day2:  { label: 'Day 2',   day: 2,     color: '#0EA5E9', emoji: '😊', badgeColor: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.3)'  },
  day4:  { label: 'Day 4',   day: 4,     color: '#F59E0B', emoji: '👋', badgeColor: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)'  },
  day6:  { label: 'Day 6',   day: 6,     color: '#10B981', emoji: '💼', badgeColor: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)'  },
  day8:  { label: 'Day 8',   day: 8,     color: '#8B5CF6', emoji: '🌟', badgeColor: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.3)'  },
  day12: { label: 'Day 12',  day: 12,    color: '#EF4444', emoji: '🚀', badgeColor: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'   },
}

const STATUS_CFG = {
  replied:       { label: 'Replied',    color: '#10B981' },
  intro_sent:    { label: 'Intro Sent', color: '#FF6B35' },
  intro_failed:  { label: 'Failed',     color: '#EF4444' },
  intro_skipped: { label: 'Skipped',    color: '#F59E0B' },
  pending:       { label: 'Pending',    color: '#6B7280' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const resolve = (tpl, name) =>
  (tpl || '').replace(/\{name\}/g, name).replace(/\{business_name\}/g, name)

const renderWA = t =>
  (t || '')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<del>$1</del>')
    .replace(/\n/g, '<br/>')

const fmtDate = iso => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const fmtPhone = p => {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  return d.startsWith('91') ? d : `91${d}`
}

const daysSince = iso => {
  if (!iso) return 999
  return Math.floor((Date.now() - new Date(iso)) / 86400000)
}

// Upload a dataUrl blob to Supabase Storage (vault bucket) → returns public URL
async function uploadDataUrlToStorage(dataUrl, filename) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const safeName = filename.replace(/\s+/g, '_')
  const path = `whatsapp/${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from('vault').upload(path, blob, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('vault').getPublicUrl(path)
  return data.publicUrl
}

// ── useFollowupSchedule ───────────────────────────────────────────────────────
function useFollowupSchedule() {
  const [schedule, setSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wa_followup_schedule') || '{}') } catch { return {} }
  })

  const persist = s => { setSchedule(s); localStorage.setItem('wa_followup_schedule', JSON.stringify(s)) }

  const markSent = (leadIds, type) => {
    const now = new Date().toISOString()
    const updated = { ...schedule }
    leadIds.forEach(id => {
      updated[id] = { ...(updated[id] || {}), [`${type}_sent_at`]: now }
      if (type === 'intro') updated[id].intro_sent_at = now
    })
    persist(updated)
  }

  const getLeadSchedule = id => schedule[id] || {}

  const getNextDue = (leadId, repliedAt) => {
    if (repliedAt) return null  // replied leads don't need followup
    const entry = schedule[leadId] || {}
    if (!entry.intro_sent_at) return null
    const introAge = daysSince(entry.intro_sent_at)
    for (const days of FOLLOWUP_DAYS) {
      const key = `day${days}_sent_at`
      if (!entry[key] && introAge >= days) return `day${days}`
    }
    return null
  }

  const isDue = leadId => getNextDue(leadId) !== null

  return { schedule, markSent, getLeadSchedule, getNextDue, isDue }
}

// ── useTemplateMedia ──────────────────────────────────────────────────────────
function useTemplateMedia() {
  const [media, setMedia] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wa_template_media') || '{}') } catch { return {} }
  })
  const setForKey = (key, val) => {
    const updated = { ...media, [key]: val }
    setMedia(updated)
    localStorage.setItem('wa_template_media', JSON.stringify(updated))
  }
  const clearForKey = key => setForKey(key, null)
  return { media, setForKey, clearForKey }
}

// ── useCampaigns ──────────────────────────────────────────────────────────────
function useCampaigns() {
  const [campaigns, setCampaigns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wa_campaigns') || '[]') } catch { return [] }
  })
  const persist = list => { setCampaigns(list); localStorage.setItem('wa_campaigns', JSON.stringify(list)) }
  const createCampaign = ({ name, message, mediaUrl, mediaType, mediaName }) => {
    const camp = { id: `camp_${Date.now()}`, name, message, mediaUrl: mediaUrl || null, mediaType: mediaType || null, mediaName: mediaName || null, createdAt: new Date().toISOString(), sentLog: {} }
    persist([camp, ...campaigns]); return camp
  }
  const updateSentLog = (campId, patch) => persist(campaigns.map(c => c.id === campId ? { ...c, sentLog: { ...c.sentLog, ...patch } } : c))
  const deleteCampaign = campId => persist(campaigns.filter(c => c.id !== campId))
  return { campaigns, createCampaign, updateSentLog, deleteCampaign }
}

// ── TemplateEditorModal ───────────────────────────────────────────────────────
function TemplateEditorModal({ templates, templateMedia, onSave, onSaveMedia, onClose }) {
  const [draft, setDraft] = useState({ ...templates })
  const [activeKey, setActiveKey] = useState('intro')
  const [localMedia, setLocalMedia] = useState({ ...templateMedia })
  const fileRef = useRef()

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    let type = 'document'
    if (f.type.startsWith('image/')) type = 'image'
    else if (f.type.startsWith('video/')) type = 'video'
    else if (f.type.startsWith('audio/')) type = 'audio'
    const reader = new FileReader()
    reader.onload = ev => {
      const updated = { ...localMedia, [activeKey]: { dataUrl: ev.target.result, type, name: f.name, size: f.size } }
      setLocalMedia(updated)
    }
    reader.readAsDataURL(f)
  }

  const handleSave = () => {
    localStorage.setItem('wa_templates', JSON.stringify(draft))
    onSave(draft)
    onSaveMedia(localMedia)
    toast.success('Templates saved!')
    onClose()
  }

  const previewText = resolve(draft[activeKey] || '', 'Sample Business')
  const meta = TEMPLATE_META[activeKey]
  const currentMedia = localMedia[activeKey]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 920, maxHeight: '92vh', borderRadius: 16, background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={17} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Message Templates</h2>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280' }}>Set intro & follow-up messages with media attachments</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => { setDraft({ ...DEFAULT_TEMPLATES }); setLocalMedia({}) }}
              style={{ padding: '0.38rem 0.85rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Reset</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '168px 1fr 300px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left: template tabs */}
          <div style={{ borderRight: '1px solid #e5e7eb', padding: '0.75rem 0.6rem', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', background: '#f9fafb' }}>
            {Object.entries(TEMPLATE_META).map(([key, cfg]) => (
              <button key={key} onClick={() => setActiveKey(key)}
                style={{ padding: '0.65rem 0.75rem', borderRadius: 10, border: `1.5px solid ${activeKey === key ? cfg.color : 'transparent'}`, background: activeKey === key ? '#fff' : 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem', fontWeight: activeKey === key ? 700 : 500, transition: 'all 0.15s', boxShadow: activeKey === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: '1.1rem' }}>{cfg.emoji}</span>
                  <div>
                    <div style={{ color: activeKey === key ? cfg.color : '#374151', fontSize: '0.82rem', fontWeight: activeKey === key ? 700 : 600 }}>{cfg.label}</div>
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{cfg.day ? `Day ${cfg.day} follow-up` : 'First contact'}</div>
                  </div>
                </div>
                {localMedia[key] && (
                  <div style={{ fontSize: '0.62rem', color: '#10B981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Paperclip size={9} /> {localMedia[key].name?.substring(0, 14)}
                  </div>
                )}
              </button>
            ))}

            <div style={{ marginTop: 'auto', padding: '0.6rem 0.4rem 0', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.65rem', color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>
                <code style={{ background: '#f3f4f6', padding: '0 4px', borderRadius: 3, color: '#374151' }}>{'{name}'}</code> — business name<br />
                <code style={{ background: '#f3f4f6', padding: '0 4px', borderRadius: 3, color: '#374151' }}>*bold*</code> <code style={{ background: '#f3f4f6', padding: '0 4px', borderRadius: 3, color: '#374151' }}>_italic_</code>
              </p>
            </div>
          </div>

          {/* Middle: editor */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
            {/* Editor header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 1rem', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 6 }}>{meta.day ? `— Day ${meta.day} Follow-up` : '— First Contact'}</span>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={draft[activeKey] || ''}
              onChange={e => setDraft(d => ({ ...d, [activeKey]: e.target.value }))}
              style={{ flex: 1, padding: '1rem', background: '#fff', border: 'none', outline: 'none', color: '#111827', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'none', lineHeight: 1.75 }}
              placeholder="Type your message here… Use {name} for business name, *bold*, _italic_"
            />

            {/* Media attached indicator */}
            {currentMedia && (
              <div style={{ margin: '0 1rem', padding: '0.4rem 0.75rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCheck size={13} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.75rem', color: '#16a34a', flex: 1 }}>
                  {currentMedia.type === 'image' ? '🖼️' : currentMedia.type === 'video' ? '🎥' : currentMedia.type === 'audio' ? '🎵' : '📄'} {currentMedia.name}
                </span>
                <button onClick={() => setLocalMedia(m => ({ ...m, [activeKey]: null }))}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
              </div>
            )}

            {/* Attach media */}
            <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600 }}>Attach:</span>
                {[{ label: '🖼️ Image', accept: 'image/*' }, { label: '🎥 Video', accept: 'video/*' }, { label: '🎵 Audio', accept: 'audio/*' }, { label: '📄 PDF', accept: 'application/pdf' }, { label: '📁 File', accept: '*/*' }].map(b => (
                  <button key={b.label} onClick={() => { fileRef.current.accept = b.accept; fileRef.current.click() }}
                    style={{ padding: '0.28rem 0.65rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, color: '#374151', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}>
                    {b.label}
                  </button>
                ))}
              </div>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            </div>

            {/* Quick inserts */}
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0, background: '#f9fafb' }}>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af', alignSelf: 'center' }}>Insert:</span>
              {['{name}', '*bold*', '_italic_', '😊', '🙏', '🚀', '👋', '💼', '✅', '📞'].map(h => (
                <button key={h} onClick={() => setDraft(d => ({ ...d, [activeKey]: (d[activeKey] || '') + h }))}
                  style={{ padding: '0.2rem 0.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.72rem', color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Right: WA phone preview */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e5ddd5' }}>
            <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.08)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', background: '#075e54', color: '#fff', flexShrink: 0 }}>
              📱 WhatsApp Preview
            </div>
            {/* Chat header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.9rem', background: '#075e54', flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>S</div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Sample Business</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)' }}>online</div>
              </div>
            </div>
            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem', background: '#e5ddd5' }}>
              {currentMedia && currentMedia.type === 'image' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <img src={currentMedia.dataUrl} alt="" style={{ maxWidth: '75%', borderRadius: '8px 8px 0 8px', maxHeight: 140, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
              )}
              {currentMedia && currentMedia.type !== 'image' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.8rem', background: '#dcf8c6', borderRadius: '8px 8px 0 8px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                    <span style={{ fontSize: '1.2rem' }}>{currentMedia.type === 'video' ? '🎥' : currentMedia.type === 'audio' ? '🎵' : '📄'}</span>
                    <span style={{ fontSize: '0.78rem', color: '#111' }}>{currentMedia.name}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '80%', background: '#dcf8c6', borderRadius: '8px 8px 0 8px', padding: '0.55rem 0.8rem', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#111827', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: renderWA(previewText) }} />
                  <div style={{ fontSize: '0.62rem', color: '#667781', textAlign: 'right', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    <CheckCheck size={11} style={{ color: '#53bdeb' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fff' }}>
          <button onClick={onClose} style={{ padding: '0.55rem 1.2rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '0.55rem 1.5rem', background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(255,107,53,0.4)' }}>
            <CheckCheck size={15} /> Save All Templates
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BulkSendBar ───────────────────────────────────────────────────────────────
function BulkSendBar({ selected, leads, templates, templateMedia, onClear, onDone }) {
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [activeType, setActiveType] = useState(null)

  const SEND_TYPES = Object.entries(TEMPLATE_META).map(([key, cfg]) => ({ key, ...cfg }))

  const handleSend = async (type) => {
    const targets = leads.filter(l => selected.includes(l.id))
    if (!targets.length) return
    const media = templateMedia[type.key]
    setSending(true); setActiveType(type.key); setProgress({ done: 0, total: targets.length })

    // Upload media once if needed
    let mediaUrl = null, mediaType = null
    if (media?.dataUrl) {
      try { mediaUrl = await uploadDataUrlToStorage(media.dataUrl, media.name); mediaType = media.type }
      catch (e) { toast.error('Media upload failed: ' + e.message) }
    }

    let successCount = 0, failCount = 0
    for (let i = 0; i < targets.length; i++) {
      const lead = targets[i]
      const name = lead.business_name || lead.owner_name || 'there'
      const text = resolve(templates[type.key], name)
      try {
        await api.post(`/api/whatsapp/send/${lead.id}`, {
          message: text,
          formatted_markdown: text,
          ...(mediaUrl ? { media_url: mediaUrl, media_type: mediaType } : {}),
        })
        successCount++
      } catch { failCount++ }
      setProgress({ done: i + 1, total: targets.length })
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 500))
    }

    if (failCount) toast.error(`${failCount} failed — check WhatsApp API settings`)
    if (successCount) toast.success(`${type.label} sent to ${successCount} lead${successCount > 1 ? 's' : ''}`)
    setSending(false); setActiveType(null); onDone()
  }

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(10,18,30,0.97)', border: '1px solid rgba(255,107,53,0.45)',
      borderRadius: 16, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center',
      gap: 8, zIndex: 50, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)',
      maxWidth: '90vw',
    }}>
      {/* Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem', color: '#FF6B35' }}>{selected.length}</div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>selected</span>
      </div>

      <div style={{ width: 1, height: 26, background: 'var(--border)', flexShrink: 0 }} />

      {/* Buttons */}
      {sending ? (
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Sending {SEND_TYPES.find(t => t.key === activeType)?.label}…</span>
            <span>{progress.done}/{progress.total}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: 'linear-gradient(90deg,#FF6B35,#FF8C5A)', borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', alignSelf: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>Send:</span>
          {SEND_TYPES.map(type => {
            const hasMedia = !!templateMedia[type.key]
            return (
              <button key={type.key} onClick={() => handleSend(type)}
                style={{ padding: '0.38rem 0.7rem', background: type.color + '20', border: `1px solid ${type.color}50`, borderRadius: 8, color: type.color, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                {type.emoji} {type.label}
                {hasMedia && <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>📎</span>}
              </button>
            )
          })}
        </div>
      )}

      <button onClick={onClear} disabled={sending} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, padding: 4 }}><X size={15} /></button>
    </div>
  )
}

// ── LeadQuickSend (individual right panel) ────────────────────────────────────
function LeadQuickSend({ lead, templates, templateMedia, followupSchedule, onSent, onClose, onMarkInterested, onMarkContacted }) {
  const [sending, setSending] = useState(null)  // key being sent

  const schedEntry = followupSchedule.getLeadSchedule(lead.id)
  const nextDue = followupSchedule.getNextDue(lead.id, lead.whatsapp_last_reply_at)

  const handleSendTemplate = async (key) => {
    const name = lead.business_name || lead.owner_name || 'there'
    const text = resolve(templates[key], name)
    const media = templateMedia[key]
    setSending(key)

    try {
      // Upload media if attached
      let mediaUrl = null, mediaType = null
      if (media?.dataUrl) {
        try { mediaUrl = await uploadDataUrlToStorage(media.dataUrl, media.name); mediaType = media.type }
        catch (e) { toast.error('Media upload failed: ' + e.message) }
      }

      await api.post(`/api/whatsapp/send/${lead.id}`, {
        message: text,
        formatted_markdown: text,
        ...(mediaUrl ? { media_url: mediaUrl, media_type: mediaType } : {}),
      })
      toast.success(`${TEMPLATE_META[key].label} sent!`)
      followupSchedule.markSent([lead.id], key)
      onSent && onSent(lead.id, key)
    } catch (e) {
      toast.error('Send failed: ' + (e.response?.data?.error || e.message))
    }

    // Update lead WA status — isolated so it never blocks or errors the send flow
    try {
      await supabase.from('leads').update({
        whatsapp_intro_sent: true,
        whatsapp_status: key === 'intro' ? 'intro_sent' : `followup_${key}`,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)
    } catch {}

    setTimeout(() => setSending(null), 1000)
  }

  const stCfg = STATUS_CFG[lead.whatsapp_status] || STATUS_CFG.pending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Lead header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.9rem', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#fff', flexShrink: 0 }}>
          {(lead.business_name || lead.owner_name || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.business_name || lead.owner_name}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={9} />{lead.phone}
            {lead.city && <><MapPin size={9} />{lead.city}</>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: '0.62rem', padding: '0.18rem 0.5rem', borderRadius: 20, background: `${stCfg.color}25`, color: stCfg.color, fontWeight: 600 }}>{stCfg.label}</span>
          {lead.phone && (
            <button
              onClick={() => {
                const phone = lead.phone.replace(/\D/g, '')
                window.open(`https://wa.me/${phone}`, '_blank')
                onMarkContacted && onMarkContacted(lead)
              }}
              title="Open WhatsApp manually"
              style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.4)', borderRadius: 8, color: '#25D366', cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={11} /> Open WA
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><X size={15} /></button>
        </div>
      </div>

      {/* Followup due alert */}
      {nextDue && (
        <div style={{ margin: '0.6rem 0.7rem 0', padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Bell size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>Follow-up {TEMPLATE_META[nextDue]?.label} is due!</span>
        </div>
      )}

      {/* Template quick-send buttons */}
      <div style={{ padding: '0.6rem 0.7rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Quick Send</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Object.entries(TEMPLATE_META).map(([key, cfg]) => {
            const sentAt = schedEntry[`${key}_sent_at`]
            const media = templateMedia[key]
            const isDue = nextDue === key
            const isSending = sending === key
            return (
              <button key={key} onClick={() => handleSendTemplate(key)} disabled={isSending}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.7rem', background: isDue ? cfg.color + '18' : 'var(--bg-secondary)', border: `1px solid ${isDue ? cfg.color + '55' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{cfg.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    {cfg.day && <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Day {cfg.day}</span>}
                    {media && <span style={{ fontSize: '0.6rem', color: '#10B981' }}>📎 {media.name?.substring(0, 10)}</span>}
                    {isDue && <span style={{ fontSize: '0.6rem', padding: '0.08rem 0.4rem', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: 10, fontWeight: 700 }}>DUE</span>}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resolve((templates[key] || '').split('\n')[0], lead.business_name || 'Business')}
                  </div>
                </div>
                {sentAt ? (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <CheckCheck size={13} style={{ color: '#10B981' }} />
                    <div style={{ fontSize: '0.6rem', color: '#10B981' }}>{fmtDate(sentAt)}</div>
                  </div>
                ) : isSending ? (
                  <Loader size={13} style={{ animation: 'spin 1s linear infinite', color: cfg.color, flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Mark as Interested */}
        <button onClick={() => onMarkInterested(lead)} style={{ width: '100%', marginTop: 8, padding: '0.45rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, color: '#F59E0B', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Star size={13} /> Mark as Interested
        </button>
      </div>

      {/* WAChatPanel for history + custom messages */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <WAChatPanel lead={lead} hideIntroCta />
      </div>
    </div>
  )
}

// ── CreateCampaignModal ───────────────────────────────────────────────────────
function CreateCampaignModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const fileRef = useRef()

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    let type = 'document'
    if (f.type.startsWith('image/')) type = 'image'
    else if (f.type.startsWith('video/')) type = 'video'
    else if (f.type.startsWith('audio/')) type = 'audio'
    const reader = new FileReader()
    reader.onload = ev => setMediaFile({ dataUrl: ev.target.result, name: f.name, type })
    reader.readAsDataURL(f)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 560, borderRadius: 16, background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={17} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>New Campaign</h2>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280' }}>Send bulk WhatsApp messages to your leads</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>
        {/* Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, marginBottom: 5, display: 'block' }}>Campaign Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali Festival Offer"
              style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, color: '#111827', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, marginBottom: 5, display: 'block' }}>
              Message <span style={{ color: '#9ca3af', fontWeight: 400 }}>(use &#123;name&#125; for business name)</span>
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Hi {name}! 👋 …"
              style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, color: '#111827', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {['{name}', '*bold*', '_italic_', '😊', '🙏', '🚀', '👋', '✅'].map(h => (
                <button key={h} onClick={() => setMessage(m => m + h)}
                  style={{ padding: '0.18rem 0.5rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.72rem', color: '#374151', cursor: 'pointer' }}>{h}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, marginBottom: 6, display: 'block' }}>Attach Media <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {[{ icon: <ImageIcon size={12} />, l: 'Image', a: 'image/*' }, { icon: <Video size={12} />, l: 'Video', a: 'video/*' }, { icon: <Music size={12} />, l: 'Audio', a: 'audio/*' }, { icon: <FileText size={12} />, l: 'PDF', a: 'application/pdf' }, { icon: <Paperclip size={12} />, l: 'File', a: '*/*' }].map(b => (
                <button key={b.l} onClick={() => { fileRef.current.accept = b.a; fileRef.current.click() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.32rem 0.65rem', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 7, color: '#374151', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500 }}>
                  {b.icon}{b.l}
                </button>
              ))}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            {mediaFile && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 7, padding: '0.4rem 0.75rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                <CheckCheck size={13} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.76rem', color: '#16a34a', flex: 1 }}>{mediaFile.name}</span>
                <button onClick={() => setMediaFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '0.9rem 1.25rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.6rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancel</button>
          <button onClick={() => { if (!name.trim() || !message.trim()) { toast.error('Name and message required'); return } onCreate({ name, message, mediaUrl: mediaFile?.dataUrl || null, mediaType: mediaFile?.type || null, mediaName: mediaFile?.name || null }); onClose() }}
            style={{ flex: 2, padding: '0.6rem', background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: '0.88rem', boxShadow: '0 4px 14px rgba(255,107,53,0.4)' }}>
            <Plus size={15} /> Create Campaign
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CampaignCard ──────────────────────────────────────────────────────────────
function CampaignCard({ campaign, totalLeads, onOpen, onDelete }) {
  const log = campaign.sentLog || {}
  const sentCount = Object.values(log).filter(s => s === 'sent').length
  const failedCount = Object.values(log).filter(s => s === 'failed').length
  const remaining = Math.max(0, totalLeads - sentCount - failedCount)
  const progress = totalLeads > 0 ? Math.round((sentCount / totalLeads) * 100) : 0
  return (
    <div onClick={() => onOpen(campaign)}
      style={{ borderRadius: 14, padding: '1.05rem', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor = 'var(--orange)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 3px', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: '0.7rem' }}><Calendar size={9} />{fmtDate(campaign.createdAt)}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(campaign.id) }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, opacity: 0.7 }}><Trash2 size={13} /></button>
      </div>
      <p style={{ margin: '0 0 0.7rem', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{campaign.message}</p>
      <div style={{ display: 'flex', gap: 5, marginBottom: '0.7rem' }}>
        {[{ n: totalLeads, l: 'All', c: 'var(--bg-secondary)', t: 'var(--text-primary)' }, { n: remaining, l: 'Remaining', c: 'rgba(14,165,233,0.12)', t: '#0EA5E9' }, { n: sentCount, l: 'Sent', c: 'rgba(16,185,129,0.12)', t: '#10B981' }, { n: failedCount, l: 'Failed', c: 'rgba(239,68,68,0.12)', t: '#EF4444' }].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '0.35rem', background: s.c, borderRadius: 7 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: s.t }}>{s.n}</div>
            <div style={{ fontSize: '0.6rem', color: s.t }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#10B981,#34D399)', borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
        <span>{progress}% complete</span>
        <span style={{ color: '#FF6B35', display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={9} /> Open</span>
      </div>
    </div>
  )
}

// ── CampaignDetailView ────────────────────────────────────────────────────────
const CDV_PAGE_SIZE = 50

function CampaignDetailView({ campaign, allLeads, onBack, onLogUpdate }) {
  const [sessionLog, setSessionLog] = useState({})
  const [tab, setTab] = useState('remaining')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [cdvPage, setCdvPage] = useState(1)
  const [message, setMessage] = useState(campaign.message || '')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ done: 0, total: 0 })
  const [mediaFile, setMediaFile] = useState(null)
  const fileRef = useRef()

  const handleMediaFile = e => {
    const f = e.target.files[0]; if (!f) return
    let type = 'document'
    if (f.type.startsWith('image/')) type = 'image'
    else if (f.type.startsWith('video/')) type = 'video'
    else if (f.type.startsWith('audio/')) type = 'audio'
    const reader = new FileReader()
    reader.onload = ev => setMediaFile({ dataUrl: ev.target.result, name: f.name, type, mime: f.type })
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  const fullLog = { ...campaign.sentLog, ...sessionLog }
  const tabCounts = { all: allLeads.length, remaining: allLeads.filter(l => { const s = fullLog[l.id]; return !s || s === 'pending' }).length, sent: Object.values(fullLog).filter(s => s === 'sent').length, failed: Object.values(fullLog).filter(s => s === 'failed').length }
  const filteredLeads = (() => {
    let list = allLeads
    if (search) { const q = search.toLowerCase(); list = list.filter(l => (l.business_name || '').toLowerCase().includes(q) || (l.phone || '').includes(q)) }
    if (tab === 'remaining') list = list.filter(l => { const s = fullLog[l.id]; return !s || s === 'pending' })
    else if (tab === 'sent') list = list.filter(l => fullLog[l.id] === 'sent')
    else if (tab === 'failed') list = list.filter(l => fullLog[l.id] === 'failed')
    return list
  })()

  // Reset to page 1 whenever tab or search changes
  useEffect(() => setCdvPage(1), [tab, search])

  const cdvTotalPages = Math.max(1, Math.ceil(filteredLeads.length / CDV_PAGE_SIZE))
  const pagedFilteredLeads = filteredLeads.slice((cdvPage - 1) * CDV_PAGE_SIZE, cdvPage * CDV_PAGE_SIZE)

  const handleSend = async () => {
    const targets = allLeads.filter(l => selected.includes(l.id))
    if (!targets.length) { toast.error('Select at least one lead'); return }
    setSending(true); setSendProgress({ done: 0, total: targets.length })

    // Upload media once if attached
    let mediaUrl = null, mediaType = null
    if (mediaFile?.dataUrl) {
      try { mediaUrl = await uploadDataUrlToStorage(mediaFile.dataUrl, mediaFile.name); mediaType = mediaFile.type }
      catch (e) { toast.error('Media upload failed: ' + e.message) }
    }

    const patch = {}
    let successCount = 0, failCount = 0
    for (let i = 0; i < targets.length; i++) {
      const lead = targets[i]
      const text = resolve(message, lead.business_name || lead.owner_name || 'there')
      try {
        await api.post(`/api/whatsapp/send/${lead.id}`, {
          message: text,
          formatted_markdown: text,
          ...(mediaUrl ? { media_url: mediaUrl, media_type: mediaType } : {}),
        })
        patch[lead.id] = 'sent'; setSessionLog(p => ({ ...p, [lead.id]: 'sent' })); successCount++
      } catch {
        patch[lead.id] = 'failed'; setSessionLog(p => ({ ...p, [lead.id]: 'failed' })); failCount++
      }
      setSendProgress({ done: i + 1, total: targets.length })
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 500))
    }
    onLogUpdate(campaign.id, patch); setSelected([]); setSending(false)
    if (failCount) toast.error(`${failCount} failed — check WhatsApp API settings`)
    if (successCount) toast.success(`Sent to ${successCount} leads`)
  }

  const previewLead = allLeads.find(l => selected.includes(l.id)) || allLeads[0]
  const previewText = previewLead ? resolve(message, previewLead.business_name || previewLead.owner_name || 'there') : message
  const TABS = [{ key: 'all', l: 'All' }, { key: 'remaining', l: 'Remaining' }, { key: 'sent', l: '✓ Sent' }, { key: 'failed', l: '✗ Failed' }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)' }}>
        <button onClick={onBack} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><ArrowLeft size={15} /></button>
        <h2 style={{ margin: 0, flex: 1, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{campaign.name}</h2>
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ l: `All ${tabCounts.all}`, bg: 'var(--bg-secondary)', c: 'var(--text-primary)' }, { l: `Remaining ${tabCounts.remaining}`, bg: 'rgba(14,165,233,0.12)', c: '#0EA5E9' }, { l: `✓ ${tabCounts.sent}`, bg: 'rgba(16,185,129,0.12)', c: '#10B981' }, { l: `✗ ${tabCounts.failed}`, bg: 'rgba(239,68,68,0.12)', c: '#EF4444' }].map(chip => (
            <span key={chip.l} style={{ padding: '0.22rem 0.55rem', background: chip.bg, borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, color: chip.c }}>{chip.l}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1, overflow: 'hidden' }}>
        {/* Lead selector */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', gap: 2, padding: '0.45rem 0.65rem', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)' }}>
            {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '0.28rem 0.6rem', borderRadius: 20, border: 'none', background: tab === t.key ? 'rgba(255,107,53,0.15)' : 'transparent', color: tab === t.key ? 'var(--orange)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: tab === t.key ? 700 : 400 }}>{t.l} ({tabCounts[t.key]})</button>)}
          </div>
          <div style={{ padding: '0.4rem 0.65rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, flexShrink: 0, background: 'var(--bg-card)' }}>
            <div style={{ flex: 1, position: 'relative' }}><Search size={11} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ width: '100%', padding: '0.32rem 0.5rem 0.32rem 22px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-primary)', fontSize: '0.76rem', boxSizing: 'border-box', outline: 'none' }} /></div>
            {selected.length > 0 ? <button onClick={() => setSelected([])} style={{ fontSize: '0.68rem', padding: '0.28rem 0.55rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#EF4444', cursor: 'pointer' }}>Clear {selected.length}</button>
              : <button onClick={() => setSelected(filteredLeads.map(l => l.id))} style={{ fontSize: '0.68rem', padding: '0.28rem 0.55rem', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 7, color: 'var(--orange)', cursor: 'pointer' }}>All</button>}
          </div>
          {/* Pagination bar */}
          {filteredLeads.length > CDV_PAGE_SIZE && (
            <div style={{ padding: '0.3rem 0.65rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, background: 'var(--bg-secondary)' }}>
              <button disabled={cdvPage === 1} onClick={() => setCdvPage(p => p - 1)}
                style={{ padding: '0.18rem 0.42rem', background: cdvPage === 1 ? 'transparent' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, color: cdvPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: cdvPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.65rem', opacity: cdvPage === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: cdvTotalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCdvPage(p)}
                  style={{ padding: '0.18rem 0.42rem', background: p === cdvPage ? 'var(--orange)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, color: p === cdvPage ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: p === cdvPage ? 700 : 400, minWidth: 22, textAlign: 'center' }}>{p}</button>
              ))}
              <button disabled={cdvPage >= cdvTotalPages} onClick={() => setCdvPage(p => p + 1)}
                style={{ padding: '0.18rem 0.42rem', background: cdvPage >= cdvTotalPages ? 'transparent' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5, color: cdvPage >= cdvTotalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: cdvPage >= cdvTotalPages ? 'not-allowed' : 'pointer', fontSize: '0.65rem', opacity: cdvPage >= cdvTotalPages ? 0.4 : 1 }}>›</button>
              <span style={{ marginLeft: 'auto', fontSize: '0.63rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {(cdvPage - 1) * CDV_PAGE_SIZE + 1}–{Math.min(cdvPage * CDV_PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}
              </span>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.35rem' }}>
            {pagedFilteredLeads.map(lead => { const status = fullLog[lead.id]; const isSel = selected.includes(lead.id); return (
              <div key={lead.id} onClick={() => tab !== 'sent' && (isSel ? setSelected(p => p.filter(x => x !== lead.id)) : setSelected(p => [...p, lead.id]))}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.42rem 0.55rem', borderRadius: 9, marginBottom: 2, background: isSel ? 'rgba(255,107,53,0.08)' : 'var(--bg-card)', border: `1px solid ${isSel ? 'rgba(255,107,53,0.35)' : 'var(--border)'}`, cursor: 'pointer' }}>
                {tab !== 'sent' && <div>{isSel ? <CheckSquare size={13} style={{ color: 'var(--orange)' }} /> : <Square size={13} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}</div>}
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.business_name || lead.owner_name}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lead.phone}</div></div>
                {status && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.42rem', borderRadius: 20, background: status === 'sent' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: status === 'sent' ? '#10B981' : '#EF4444', fontWeight: 600 }}>{status === 'sent' ? '✓' : '✗'}</span>}
              </div>
            )})}
          </div>
        </div>
        {/* Compose */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-card)' }}>
          <div style={{ padding: '0.55rem 0.8rem', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0, background: 'var(--bg-secondary)' }}>Compose</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} style={{ flex: 1, padding: '0.85rem', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.86rem', fontFamily: 'inherit', resize: 'none', lineHeight: 1.65 }} />
          <div style={{ padding: '0.45rem 0.7rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
            {['*bold*', '_italic_', '{name}', '😊', '🙏', '🚀'].map(h => (<button key={h} onClick={() => setMessage(m => m + h)} style={{ padding: '0.15rem 0.4rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, fontSize: '0.68rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>{h}</button>))}
          </div>

          {/* Media attach row */}
          <div style={{ padding: '0.4rem 0.7rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {mediaFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.3rem 0.65rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }}>
                <span style={{ fontSize: '1rem' }}>{mediaFile.type === 'image' ? '🖼️' : mediaFile.type === 'video' ? '🎥' : mediaFile.type === 'audio' ? '🎵' : '📄'}</span>
                <span style={{ fontSize: '0.74rem', color: '#10B981', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mediaFile.name}</span>
                <button onClick={() => setMediaFile(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Attach:</span>
                {[{ l: '🖼️ Image', a: 'image/*' }, { l: '🎥 Video', a: 'video/*' }, { l: '🎵 Audio', a: 'audio/*' }, { l: '📄 PDF', a: 'application/pdf' }, { l: '📁 File', a: '*/*' }].map(b => (
                  <button key={b.l} onClick={() => { fileRef.current.accept = b.a; fileRef.current.click() }}
                    style={{ padding: '0.22rem 0.55rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: '0.68rem', cursor: 'pointer' }}>{b.l}</button>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleMediaFile} />
          </div>

          <div style={{ padding: '0.6rem 0.7rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {sending && <div style={{ marginBottom: 7 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}><span>Sending…</span><span>{sendProgress.done}/{sendProgress.total}</span></div><div style={{ height: 3, background: 'var(--border)', borderRadius: 3 }}><div style={{ height: '100%', width: `${sendProgress.total ? (sendProgress.done / sendProgress.total) * 100 : 0}%`, background: 'linear-gradient(90deg,#FF6B35,#FF8C5A)', transition: 'width 0.4s' }} /></div></div>}
            <button onClick={handleSend} disabled={sending || !selected.length} style={{ width: '100%', padding: '0.6rem', background: selected.length ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 9, color: selected.length ? '#fff' : 'var(--text-muted)', fontWeight: 700, cursor: selected.length && !sending ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: '0.86rem' }}>
              {sending ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {sending ? `Sending (${sendProgress.done}/${sendProgress.total})` : selected.length ? `Send to ${selected.length} Lead${selected.length > 1 ? 's' : ''}` : 'Select leads to send'}
            </button>
          </div>
        </div>
        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* WA chat header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.9rem', background: '#075e54', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>
              {(previewLead?.business_name || previewLead?.owner_name || 'L')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{previewLead?.business_name || previewLead?.owner_name || 'Select a lead'}</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>online</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 0.75rem', background: '#e5ddd5' }}>
            {previewLead ? (
              <>
                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.35)', marginBottom: 8, background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: 10, display: 'block', width: '100%', textAlign: 'center' }}>Today</div>
                {mediaFile && mediaFile.type === 'image' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <img src={mediaFile.dataUrl} alt="" style={{ maxWidth: '80%', borderRadius: '8px 8px 0 8px', maxHeight: 130, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  </div>
                )}
                {mediaFile && mediaFile.type !== 'image' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.45rem 0.75rem', background: '#dcf8c6', borderRadius: '8px 8px 0 8px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                      <span style={{ fontSize: '1.1rem' }}>{mediaFile.type === 'video' ? '🎥' : mediaFile.type === 'audio' ? '🎵' : '📄'}</span>
                      <span style={{ fontSize: '0.76rem', color: '#111' }}>{mediaFile.name}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '85%', background: '#dcf8c6', borderRadius: '8px 8px 2px 8px', padding: '0.6rem 0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#111827', lineHeight: 1.6, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: renderWA(previewText) }} />
                    <div style={{ fontSize: '0.6rem', color: '#667781', textAlign: 'right', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      <CheckCheck size={10} style={{ color: '#53bdeb' }} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(0,0,0,0.3)', fontSize: '0.78rem' }}>Select leads to preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WhatsAppCenterPage() {
  const { user } = useAuthStore()
  const [activeLead, setActiveLead] = useState(null)
  const [mainTab, setMainTab] = useState('leads')
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wa_templates') || 'null') || DEFAULT_TEMPLATES } catch { return DEFAULT_TEMPLATES }
  })

  // Leads tab state
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [waTab, setWaTab] = useState('all')
  const [selected, setSelected] = useState([])
  const [leadsPage, setLeadsPage] = useState(1)
  const [campPage, setCampPage] = useState(1)
  const [localLeadOverrides, setLocalLeadOverrides] = useState({}) // local WA status overrides
  const [confirmDeleteCamp, setConfirmDeleteCamp] = useState(null) // campaign id to delete

  const { campaigns, createCampaign, updateSentLog, deleteCampaign } = useCampaigns()
  const followupSchedule = useFollowupSchedule()
  const { media: templateMedia, setForKey: setTemplateMedia } = useTemplateMedia()

  // ── useQuery for leads (uses prefetch cache from DashboardLayout) ───────────
  const { data: rawLeads = [], isLoading, refetch: fetchLeads } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  // Filter to only leads with phone numbers + merge local overrides
  const leads = useMemo(() =>
    rawLeads
      .filter(l => l.phone && l.phone.trim() !== '')
      .map(l => localLeadOverrides[l.id] ? { ...l, ...localLeadOverrides[l.id] } : l),
    [rawLeads, localLeadOverrides]
  )

  // A lead counts as "contacted" if WA intro was sent OR CRM stage is beyond cold
  const CRM_CONTACTED_STAGES = ['contacted', 'warm', 'hot', 'interested', 'proposal', 'negotiation', 'converted']
  const isWAContacted = (l) => l.whatsapp_intro_sent || CRM_CONTACTED_STAGES.includes(l.status)

  // ── Tab filtering ──────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let list = leads
    if (search) { const q = search.toLowerCase(); list = list.filter(l => (l.business_name || '').toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.city || '').toLowerCase().includes(q)) }
    if (waTab === 'pending')   list = list.filter(l => !isWAContacted(l) && l.whatsapp_status !== 'replied')
    if (waTab === 'contacted') list = list.filter(l => isWAContacted(l) && l.whatsapp_status !== 'replied')
    if (waTab === 'replied')   list = list.filter(l => l.whatsapp_status === 'replied')
    if (waTab === 'due')       list = list.filter(l => followupSchedule.isDue(l.id))
    return list
  }, [leads, search, waTab, followupSchedule])

  const counts = useMemo(() => ({
    all:       leads.length,
    pending:   leads.filter(l => !isWAContacted(l) && l.whatsapp_status !== 'replied').length,
    contacted: leads.filter(l => isWAContacted(l) && l.whatsapp_status !== 'replied').length,
    replied:   leads.filter(l => l.whatsapp_status === 'replied').length,
    due:       leads.filter(l => followupSchedule.isDue(l.id)).length,
  }), [leads, followupSchedule])

  const pagedLeads = useMemo(() => filteredLeads.slice((leadsPage - 1) * PAGE_SIZE, leadsPage * PAGE_SIZE), [filteredLeads, leadsPage])
  const pagedCampaigns = useMemo(() => campaigns.slice((campPage - 1) * PAGE_SIZE, campPage * PAGE_SIZE), [campaigns, campPage])

  // Reset page on filter change
  useEffect(() => setLeadsPage(1), [search, waTab])

  // Mark as contacted (manual WhatsApp)
  const handleMarkContacted = async (lead) => {
    if (lead.whatsapp_intro_sent) return // already contacted — no-op
    try {
      await supabase.from('leads').update({
        whatsapp_intro_sent: true,
        whatsapp_status: 'intro_sent',
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)
      const update = { whatsapp_intro_sent: true, whatsapp_status: 'intro_sent' }
      setLocalLeadOverrides(p => ({ ...p, [lead.id]: { ...(p[lead.id] || {}), ...update } }))
      if (activeLead?.id === lead.id) setActiveLead(prev => ({ ...prev, ...update }))
    } catch { /* silent — don't block wa.me open */ }
  }

  // Mark as interested
  const handleMarkInterested = async (lead) => {
    try {
      await supabase.from('leads').update({ is_interested: true, whatsapp_status: 'replied', updated_at: new Date().toISOString() }).eq('id', lead.id)
      setLocalLeadOverrides(p => ({ ...p, [lead.id]: { is_interested: true, whatsapp_status: 'replied' } }))
      if (activeLead?.id === lead.id) setActiveLead(prev => ({ ...prev, is_interested: true, whatsapp_status: 'replied' }))
      toast.success(`${lead.business_name || lead.owner_name} marked as Interested!`)
    } catch { toast.error('Failed to update') }
  }

  const handleSent = (leadId, key) => {
    const update = { whatsapp_intro_sent: true, whatsapp_status: key === 'intro' ? 'intro_sent' : `followup_${key}` }
    setLocalLeadOverrides(p => ({ ...p, [leadId]: { ...(p[leadId] || {}), ...update } }))
    if (activeLead?.id === leadId) setActiveLead(prev => ({ ...prev, ...update }))
  }

  // Campaign logic
  const handleLogUpdate = (campId, patch) => {
    updateSentLog(campId, patch)
    setActiveCampaign(prev => prev ? { ...prev, sentLog: { ...prev.sentLog, ...patch } } : prev)
  }

  // Campaign detail view
  if (activeCampaign) {
    return (
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CampaignDetailView campaign={activeCampaign} allLeads={leads} onBack={() => setActiveCampaign(null)} onLogUpdate={handleLogUpdate} />
      </div>
    )
  }

  // ── Lead card (exact CRM Pipeline style) ────────────────────────────────────
  const renderLeadCard = lead => {
    const st = lead.whatsapp_status; const stCfg = STATUS_CFG[st] || STATUS_CFG.pending
    const isSel = selected.includes(lead.id)
    const isDue = followupSchedule.isDue(lead.id)
    return (
      <div key={lead.id} className="glass rounded-xl cursor-pointer transition-all group relative"
        style={{
          padding: '1rem',
          borderLeft: `3px solid ${isSel ? 'var(--orange)' : isDue ? '#F59E0B' : stCfg.color}`,
          boxShadow: isSel ? '0 0 0 2px var(--orange), 0 2px 12px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.15)',
          background: isSel ? 'rgba(255,107,53,0.04)' : undefined,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isSel ? `0 0 0 2px var(--orange), 0 8px 28px ${stCfg.color}30` : `0 8px 28px ${stCfg.color}30` }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isSel ? '0 0 0 2px var(--orange), 0 2px 12px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.15)' }}>

        {/* Checkbox — top left */}
        <button onClick={e => { e.stopPropagation(); setSelected(p => p.includes(lead.id) ? p.filter(x => x !== lead.id) : [...p, lead.id]) }}
          className="absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded flex items-center justify-center transition-all"
          style={{ opacity: isSel ? 1 : 0, background: isSel ? 'var(--orange)' : 'var(--bg-secondary)', border: `1.5px solid ${isSel ? 'var(--orange)' : 'var(--border)'}` }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { if (!isSel) e.currentTarget.style.opacity = '0' }}>
          {isSel && <CheckSquare size={10} color="#fff" />}
        </button>

        <div onClick={() => setActiveLead(lead)}>
          {/* Status dot + label */}
          <div className="flex items-center gap-1.5 mb-2.5 pl-5">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stCfg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: stCfg.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stCfg.label}</span>
            {isDue && <span style={{ marginLeft: 4, fontSize: '0.58rem', padding: '0.08rem 0.38rem', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: 10, fontWeight: 700 }}>DUE</span>}
            {lead.is_interested && <Heart size={10} style={{ color: '#F59E0B', marginLeft: 'auto' }} />}
          </div>

          {/* Business name */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <Phone size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span className="text-sm font-semibold leading-tight line-clamp-1" style={{ color: 'var(--text-primary)' }}>
              {lead.business_name || lead.owner_name || 'Unknown'}
            </span>
          </div>

          {/* Phone + City */}
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            <span>{lead.phone}</span>
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />{lead.city}
              </span>
            )}
          </div>
        </div>

        <button onClick={() => { setActiveLead(lead); handleMarkContacted(lead) }}
          style={{ width: '100%', padding: '0.38rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, color: '#25D366', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <MessageCircle size={11} /> Open &amp; Send
        </button>
      </div>
    )
  }

  const renderLeadRow = (lead, idx) => {
    const st = lead.whatsapp_status; const stCfg = STATUS_CFG[st] || STATUS_CFG.pending
    const isSel = selected.includes(lead.id); const isDue = followupSchedule.isDue(lead.id)
    return (
      <tr key={lead.id} className="border-t cursor-pointer transition-colors hover:opacity-90"
        style={{ borderColor: 'var(--border)', background: isSel ? 'rgba(255,107,53,0.06)' : idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)', outline: isSel ? '1px solid rgba(255,107,53,0.25)' : 'none', outlineOffset: -1 }}>
        <td style={{ padding: '0.55rem 0.75rem', width: 32 }}>
          <div onClick={e => { e.stopPropagation(); setSelected(p => p.includes(lead.id) ? p.filter(x => x !== lead.id) : [...p, lead.id]) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isSel ? <CheckSquare size={14} style={{ color: 'var(--orange)' }} /> : <Square size={14} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
          </div>
        </td>
        <td style={{ padding: '0.55rem 0.6rem' }} onClick={() => setActiveLead(lead)}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.business_name || lead.owner_name}</div>
          {lead.owner_name && lead.business_name && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lead.owner_name}</div>}
        </td>
        <td style={{ padding: '0.55rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }} onClick={() => setActiveLead(lead)}>{lead.phone}</td>
        <td style={{ padding: '0.55rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }} onClick={() => setActiveLead(lead)}>{lead.city || '—'}</td>
        <td style={{ padding: '0.55rem 0.6rem' }} onClick={() => setActiveLead(lead)}>
          <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem', borderRadius: 20, background: `${stCfg.color}20`, color: stCfg.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{stCfg.label}</span>
          {isDue && <span style={{ marginLeft: 4, fontSize: '0.6rem', padding: '0.1rem 0.38rem', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: 10, fontWeight: 700 }}>DUE</span>}
        </td>
        <td style={{ padding: '0.55rem 0.6rem' }}>
          <button onClick={() => setActiveLead(lead)} style={{ padding: '0.3rem 0.75rem', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 6, color: '#25D366', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MessageCircle size={10} /> Open
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={17} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>WhatsApp Center</h1>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{leads.length} leads · {counts.contacted} contacted · {counts.replied} replied · {counts.due > 0 ? <span style={{ color: '#F59E0B', fontWeight: 700 }}>{counts.due} due for followup</span> : '0 due'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={fetchLeads} style={{ padding: '0.38rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><RefreshCw size={13} /></button>
            {mainTab === 'campaigns' && (
              <button onClick={() => setShowCreateCampaign(true)} style={{ padding: '0.42rem 0.85rem', background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}>
                <Plus size={13} /> New Campaign
              </button>
            )}
          </div>
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0.4rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[{ key: 'leads', label: 'Leads', icon: <Users size={13} /> }, { key: 'campaigns', label: `Campaigns (${campaigns.length})`, icon: <MessageCircle size={13} /> }].map(t => (
            <button key={t.key} onClick={() => { setMainTab(t.key); setSelected([]) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.38rem 0.85rem', borderRadius: 20, border: 'none', background: mainTab === t.key ? 'rgba(255,107,53,0.15)' : 'transparent', color: mainTab === t.key ? '#FF6B35' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: mainTab === t.key ? 700 : 400, fontSize: '0.82rem' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── LEADS TAB ─────────────────────────────────────────────────────── */}
        {mainTab === 'leads' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.45rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 2 }}>
                {[
                  { key: 'all',       label: `All (${counts.all})` },
                  { key: 'pending',   label: `Pending (${counts.pending})` },
                  { key: 'contacted', label: `Contacted (${counts.contacted})` },
                  { key: 'replied',   label: `Replied (${counts.replied})` },
                  { key: 'due',       label: `Due Followup (${counts.due})`, alert: counts.due > 0 },
                ].map(t => (
                  <button key={t.key} onClick={() => { setWaTab(t.key); setSelected([]) }}
                    style={{ padding: '0.25rem 0.6rem', borderRadius: 20, border: 'none', background: waTab === t.key ? (t.alert ? 'rgba(245,158,11,0.2)' : 'rgba(37,211,102,0.15)') : 'transparent', color: waTab === t.key ? (t.alert ? '#F59E0B' : '#25D366') : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.71rem', fontWeight: waTab === t.key ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 130, position: 'relative' }}>
                <Search size={11} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ width: '100%', padding: '0.32rem 0.55rem 0.32rem 22px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-primary)', fontSize: '0.76rem', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              {selected.length === 0
                ? <button onClick={() => setSelected(filteredLeads.map(l => l.id))} style={{ padding: '0.32rem 0.7rem', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 7, color: '#FF6B35', fontSize: '0.71rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><CheckSquare size={12} /> Select All</button>
                : <button onClick={() => setSelected([])} style={{ padding: '0.32rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, color: '#EF4444', fontSize: '0.71rem', cursor: 'pointer' }}>Clear ({selected.length})</button>
              }
              <button onClick={() => setShowTemplates(true)} style={{ padding: '0.32rem 0.7rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-secondary)', fontSize: '0.71rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Settings size={12} /> Templates
              </button>
              <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '0.32rem', borderRadius: 6, border: '1px solid var(--border)', background: viewMode === 'grid' ? 'var(--orange)' : 'var(--bg-secondary)', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}><LayoutGrid size={13} /></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '0.32rem', borderRadius: 6, border: '1px solid var(--border)', background: viewMode === 'list' ? 'var(--orange)' : 'var(--bg-secondary)', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}><List size={13} /></button>
              </div>
            </div>

            {/* Pagination bar — above content, matches CRM Pipeline */}
            {filteredLeads.length > 0 && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
                <PaginationBar
                  current={leadsPage}
                  total={Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE))}
                  onChange={setLeadsPage}
                  from={(leadsPage - 1) * PAGE_SIZE + 1}
                  to={Math.min(leadsPage * PAGE_SIZE, filteredLeads.length)}
                  total_count={filteredLeads.length}
                />
              </div>
            )}

            {/* Lead list */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.7rem 1rem' }}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--text-secondary)' }}>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading leads…
                </div>
              ) : filteredLeads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <Users size={34} style={{ opacity: 0.25, marginBottom: 10 }} />
                  <p style={{ margin: 0 }}>No leads in this tab</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
                  {pagedLeads.map(renderLeadCard)}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ width: 32, padding: '0.55rem 0.75rem' }} />
                        {['Business', 'Phone', 'City', 'Status', 'Action'].map(h => (
                          <th key={h} style={{ padding: '0.55rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>{pagedLeads.map((l, i) => renderLeadRow(l, i))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CAMPAIGNS TAB ─────────────────────────────────────────────────── */}
        {mainTab === 'campaigns' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {campaigns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <MessageCircle size={46} style={{ color: 'var(--text-secondary)', opacity: 0.22, marginBottom: 12 }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No Campaigns Yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 20 }}>Create a campaign to send bulk messages to your leads</p>
                <button onClick={() => setShowCreateCampaign(true)} style={{ padding: '0.6rem 1.4rem', background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Plus size={15} /> New Campaign</button>
              </div>
            ) : (
              <>
                {/* Campaigns pagination bar — above grid */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
                  <PaginationBar
                    current={campPage}
                    total={Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE))}
                    onChange={setCampPage}
                    from={(campPage - 1) * PAGE_SIZE + 1}
                    to={Math.min(campPage * PAGE_SIZE, campaigns.length)}
                    total_count={campaigns.length}
                  />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.9rem' }}>
                    {pagedCampaigns.map(camp => (
                      <CampaignCard key={camp.id} campaign={camp} totalLeads={leads.length}
                        onOpen={c => setActiveCampaign(c)}
                        onDelete={id => setConfirmDeleteCamp(id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Right panel: Individual send ─────────────────────────────────────── */}
      {activeLead && (
        <div style={{ width: 390, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <LeadQuickSend
            lead={activeLead}
            templates={templates}
            templateMedia={templateMedia}
            followupSchedule={followupSchedule}
            onClose={() => setActiveLead(null)}
            onSent={handleSent}
            onMarkInterested={handleMarkInterested}
            onMarkContacted={handleMarkContacted}
          />
        </div>
      )}

      {/* ── BulkSendBar (floating) ────────────────────────────────────────────── */}
      {selected.length > 0 && mainTab === 'leads' && !activeLead && (
        <BulkSendBar
          selected={selected}
          leads={leads}
          templates={templates}
          templateMedia={templateMedia}
          onClear={() => setSelected([])}
          onDone={() => setSelected([])}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showTemplates && (
        <TemplateEditorModal
          templates={templates}
          templateMedia={templateMedia}
          onSave={t => setTemplates(t)}
          onSaveMedia={m => Object.entries(m).forEach(([k, v]) => setTemplateMedia(k, v))}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showCreateCampaign && (
        <CreateCampaignModal
          onClose={() => setShowCreateCampaign(false)}
          onCreate={data => { createCampaign(data); toast.success('Campaign created!') }}
        />
      )}

      {/* ── Confirm delete campaign ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDeleteCamp}
        title="Delete Campaign?"
        message="This will permanently delete the campaign and all its send history. This cannot be undone."
        confirmLabel="Delete Campaign"
        onConfirm={() => { deleteCampaign(confirmDeleteCamp); setConfirmDeleteCamp(null); toast.success('Campaign deleted') }}
        onCancel={() => setConfirmDeleteCamp(null)}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
