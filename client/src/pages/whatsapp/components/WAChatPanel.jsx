import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Loader, RefreshCw, MessageSquare, CheckCheck, Check,
  Clock, AlertCircle, Bot, Zap, Heart, Paperclip, Smile, X,
  FileText, Image, Video, File
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../stores/useAuthStore'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

// ── WA Markdown renderer ─────────────────────────────────────────────────
function renderWAText(text) {
  if (!text) return ''
  let h = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(/```([\s\S]*?)```/g,
    '<code style="font-family:\'SF Mono\',monospace;background:rgba(255,255,255,0.12);padding:1px 5px;border-radius:4px;font-size:0.87em">$1</code>')
  h = h.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
  h = h.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  h = h.replace(/~([^~\n]+)~/g, '<s>$1</s>')
  h = h.replace(/\n/g, '<br/>')
  return h
}

// ── Date label helpers ────────────────────────────────────────────────────
function dateLabel(iso) {
  const d = new Date(iso)
  const t = new Date()
  const y = new Date(); y.setDate(t.getDate() - 1)
  if (d.toDateString() === t.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function groupByDate(msgs) {
  const map = {}
  for (const m of msgs) {
    const key = new Date(m.sent_at || m.created_at).toDateString()
    if (!map[key]) map[key] = []
    map[key].push(m)
  }
  return Object.entries(map).map(([key, msgs]) => ({
    label: dateLabel(msgs[0].sent_at || msgs[0].created_at),
    msgs,
  }))
}

// ── Status ticks ──────────────────────────────────────────────────────────
function Ticks({ status }) {
  if (status === 'read')      return <CheckCheck size={12} style={{ color: '#34B7F1' }} />
  if (status === 'delivered') return <CheckCheck size={12} style={{ color: 'rgba(255,255,255,0.45)' }} />
  if (status === 'sent')      return <Check size={12} style={{ color: 'rgba(255,255,255,0.45)' }} />
  if (status === 'skipped')   return <Clock size={12} style={{ color: '#f59e0b' }} />
  if (status === 'failed')    return <AlertCircle size={12} style={{ color: '#ef4444' }} />
  return null
}

// ── Type label ────────────────────────────────────────────────────────────
function TypeTag({ type }) {
  const MAP = {
    intro:           { label: 'Intro',   color: '#FF6B35' },
    followup_day_3:  { label: 'Day 3',   color: '#F59E0B' },
    followup_day_7:  { label: 'Day 7',   color: '#F59E0B' },
    followup_day_14: { label: 'Day 14',  color: '#EF4444' },
    reply:           { label: 'Inbound', color: '#10B981' },
    custom:          { label: 'Custom',  color: '#8B5CF6' },
    bulk:            { label: 'Bulk',    color: '#0EA5E9' },
  }
  const t = MAP[type]; if (!t) return null
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
      style={{ background: `${t.color}25`, color: t.color }}>
      {t.label}
    </span>
  )
}

// ── Media bubble content ─────────────────────────────────────────────────
function MediaContent({ msg }) {
  const url  = msg.media_url
  const type = msg.media_type
  const name = msg.media_filename || 'Attachment'
  const isOut = msg.direction !== 'inbound'
  if (!url) return null

  if (type === 'image') {
    return (
      <div className="mb-1.5 rounded-xl overflow-hidden"
        style={{ maxWidth: 220, cursor: 'pointer' }}
        onClick={() => window.open(url, '_blank')}>
        <img src={url} alt="attachment" className="w-full h-auto block" style={{ maxHeight: 200, objectFit: 'cover' }} />
      </div>
    )
  }
  if (type === 'video') {
    return (
      <div className="mb-1.5 flex items-center gap-2 p-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.08)', maxWidth: 220, cursor: 'pointer' }}
        onClick={() => window.open(url, '_blank')}>
        <Video size={20} style={{ color: isOut ? 'white' : '#9ca3af' }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: 'white' }}>{name}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Video · Tap to play</p>
        </div>
      </div>
    )
  }
  // document / pdf
  const isPDF = name.toLowerCase().endsWith('.pdf') || msg.media_mime?.includes('pdf')
  return (
    <div className="mb-1.5 flex items-center gap-2 p-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.08)', maxWidth: 240, cursor: 'pointer' }}
      onClick={() => window.open(url, '_blank')}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: isPDF ? '#EF444430' : '#0EA5E930' }}>
        <FileText size={18} style={{ color: isPDF ? '#EF4444' : '#0EA5E9' }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'white', maxWidth: 170 }}>{name}</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{isPDF ? 'PDF Document' : 'Document'} · Tap to open</p>
      </div>
    </div>
  )
}

// ── Emoji picker ──────────────────────────────────────────────────────────
const EMOJIS = [
  '😊','😄','🙏','👍','🚀','🔥','💪','✅','⚡','🎯','💡','🌟','📈','💼','📱',
  '✨','🎉','❤️','👏','🤝','💰','📊','🗓️','⏰','📞','🏆','🎁','🤔','💬','🔔',
  '📌','✍️','📝','🔑','💎','🎊','🥳','😍','🌺','🌈','⭐','🎶','📸','🌙','☀️',
]

const EMOJI_CATEGORIES = {
  '🕌 Festival': ['🪔','🎆','🎇','🧨','🎊','🎉','🥂','🎁','🎀','🎈','🙏','✨','⭐','🌺','🌸','🌼','🌻','🌹','💐','🎋'],
  '💼 Business': ['💼','📈','📊','💰','🤝','✅','🏆','💡','🔑','📞','📧','🗓️','⏰','📌','✍️','📝','💎','🚀','⚡','🌟'],
  '😊 Smileys':  ['😊','😄','😃','😁','🤩','😎','🙂','😇','🥰','😍','🤗','😉','😏','🤔','😮','🤝','👋','👍','❤️','💪'],
}

function EmojiPicker({ onSelect, onClose }) {
  const [cat, setCat] = useState('😊 Smileys')
  return (
    <div className="absolute bottom-full right-0 mb-1 z-50 rounded-xl shadow-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: 280 }}>
      {/* Category tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {Object.keys(EMOJI_CATEGORIES).map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="flex-1 py-1.5 text-[10px] font-semibold transition-all truncate px-1"
            style={{ color: cat === c ? '#25D366' : 'var(--text-muted)', borderBottom: `2px solid ${cat === c ? '#25D366' : 'transparent'}`, background: 'transparent', border: 'none', borderBottom: `2px solid ${cat === c ? '#25D366' : 'transparent'}` }}>
            {c.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="p-2 grid grid-cols-10 gap-1">
        {EMOJI_CATEGORIES[cat].map(e => (
          <button key={e} onClick={() => onSelect(e)}
            className="w-6 h-6 flex items-center justify-center text-base rounded transition-all"
            style={{ background: 'transparent' }}
            onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main WAChatPanel ──────────────────────────────────────────────────────
export default function WAChatPanel({ lead, compact = false, hideIntroCta = false }) {
  const { user } = useAuthStore()
  const bottomRef    = useRef(null)
  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)

  const [messages, setMessages]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [compose, setCompose]       = useState('')
  const [showEmoji, setShowEmoji]   = useState(false)
  const [media, setMedia]           = useState(null)   // { url, type, name, mime }
  const [uploading, setUploading]   = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!lead?.id) return
    setLoading(true)
    try {
      const { data } = await api.get(`/api/whatsapp/messages/${lead.id}`)
      setMessages(data || [])
    } catch {
      const { data } = await supabase
        .from('whatsapp_messages').select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: true }).limit(100)
      setMessages(data || [])
    } finally { setLoading(false) }
  }, [lead?.id])

  useEffect(() => { fetchMessages() }, [fetchMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Realtime
  useEffect(() => {
    if (!lead?.id) return
    const ch = supabase.channel(`wachat-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `lead_id=eq.${lead.id}` },
        p => setMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages', filter: `lead_id=eq.${lead.id}` },
        p => setMessages(prev => prev.map(m => m.id === p.new.id ? p.new : m)))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [lead?.id])

  // ── Media upload to Supabase Storage ─────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const MAX = 16 * 1024 * 1024 // 16 MB
    if (file.size > MAX) { toast.error('File too large (max 16 MB)'); return }

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `whatsapp/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { error } = await supabase.storage.from('vault').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('vault').getPublicUrl(path)
      const mtype = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'document'
      setMedia({ url: urlData.publicUrl, type: mtype, name: file.name, mime: file.type })
      toast.success('File ready to send')
    } catch (e) {
      toast.error('Upload failed: ' + e.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Keyboard shortcuts in compose ─────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return }
    const ta = e.target
    if ((e.ctrlKey || e.metaKey) && ta.selectionStart !== ta.selectionEnd) {
      const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd)
      if (e.key === 'b') {
        e.preventDefault()
        insertFormatting('*', '*', ta); return
      }
      if (e.key === 'i') {
        e.preventDefault()
        insertFormatting('_', '_', ta); return
      }
    }
  }

  const insertFormatting = (open, close, ta) => {
    const s = ta.selectionStart, en = ta.selectionEnd
    const selected = compose.substring(s, en)
    const newText = compose.substring(0, s) + open + selected + close + compose.substring(en)
    setCompose(newText)
    setTimeout(() => {
      ta.selectionStart = s + open.length
      ta.selectionEnd = en + open.length
      ta.focus()
    }, 0)
  }

  const insertWrap = (open, close) => {
    const ta = textareaRef.current
    if (!ta) { setCompose(c => c + open + close); return }
    const s = ta.selectionStart, en = ta.selectionEnd
    const selected = compose.substring(s, en)
    const newText = compose.substring(0, s) + open + selected + close + compose.substring(en)
    setCompose(newText)
    setTimeout(() => { ta.focus(); ta.selectionStart = s + open.length; ta.selectionEnd = en + open.length }, 0)
  }

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current
    if (ta) {
      const s = ta.selectionStart
      setCompose(c => c.substring(0, s) + emoji + c.substring(s))
      setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + emoji.length }, 0)
    } else {
      setCompose(c => c + emoji)
    }
    setShowEmoji(false)
  }

  // ── Send ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const msg = compose.trim()
    if (!msg && !media) return
    if (!lead?.phone) { toast.error('Lead has no phone number'); return }
    setSending(true)
    try {
      await api.post(`/api/whatsapp/send/${lead.id}`, {
        message:            msg || (media ? `[${media.type}]` : ''),
        formatted_markdown: msg,
        media_url:          media?.url || null,
        media_type:         media?.type || null,
        media_filename:     media?.name || null,
        media_mime:         media?.mime || null,
      })
      setCompose(''); setMedia(null)
      fetchMessages()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally { setSending(false) }
  }

  const sendIntro = async () => {
    if (!lead?.phone) { toast.error('No phone number'); return }
    setTriggering(true)
    try {
      const { data } = await api.post(`/api/whatsapp/intro/${lead.id}`)
      toast.success(data.skipped ? 'Intro logged (WA not configured)' : 'Intro sent! 🚀')
      fetchMessages()
    } catch (e) { toast.error(e.response?.data?.error || e.message) }
    finally { setTriggering(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const introSent = lead?.whatsapp_intro_sent
  const waStatus  = lead?.whatsapp_status
  const statusColor = { replied:'#10B981', intro_sent:'#FF6B35', intro_failed:'#EF4444', intro_skipped:'#F59E0B' }[waStatus] || '#6B7280'
  const grouped = groupByDate(messages)

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* ── Lead header ── */}
      {lead && !compact && (
        <div className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: '#25D366', color: '#fff' }}>
            {lead.business_name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{lead.business_name}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {lead.phone || 'No phone'} · {waStatus?.replace(/_/g, ' ') || 'not started'}
            </p>
          </div>
          {waStatus && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
              style={{ background: `${statusColor}25`, color: statusColor }}>
              {waStatus.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
          <button onClick={fetchMessages} className="p-1.5 rounded-lg flex-shrink-0" title="Refresh"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      )}

      {/* ── Intro CTA ── */}
      {!hideIntroCta && !introSent && lead?.phone && (
        <div className="mx-3 mt-2 p-2.5 rounded-xl flex items-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)' }}>
          <Bot size={14} style={{ color: '#FF6B35' }} />
          <p className="text-xs font-semibold flex-1" style={{ color: '#FF6B35' }}>
            No intro sent to {lead.business_name}
          </p>
          <button onClick={sendIntro} disabled={triggering}
            className="text-xs px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
            style={{ background: '#FF6B35', color: 'white' }}>
            {triggering ? <Loader size={10} className="animate-spin" /> : <Zap size={10} />}
            {triggering ? 'Sending...' : 'Send AI Intro'}
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{
        minHeight: 0,
        background: '#0b141a',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zm20.97 0l8.315 8.314-1.414 1.414L34.828 0h2.83zM22.344 0L13.8 8.485 15.214 9.9l9.9-9.9h-2.77zm-8 0L4.8 9.485 6.214 10.9 17.07 0h-2.726zm33.94 0l9.9 9.9-1.415 1.414L46.828 0h1.456zM60 6.284v2.83l-9.9 9.9-1.415-1.414L60 6.285zm0 5.657v2.828L49.142 25.627l-1.414-1.414L60 11.94zm0 5.657v2.83L50.556 30.97l-1.414-1.414L60 17.597zm0 5.657v2.828l-7.9-7.9 1.414-1.414L60 23.254zm0 5.657v2.83L56.97 29.97l1.415-1.415L60 28.91zm0 5.657v2.83L53.8 34.97l1.415-1.415L60 34.567zM0 7.07v2.83l8.485 8.485-1.414 1.414L0 12.727V9.9l1.414-1.415L0 7.07zm0 5.657v2.83l5.657 5.656-1.414 1.415L0 18.384v-2.83zm0 5.657v2.83l2.828 2.828L1.414 25.457 0 24.042v-2.83zm0 5.657v2.83L0 25.456v-2.83z' fill='%23ffffff' fill-opacity='0.01' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      }}>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MessageSquare size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No messages yet</p>
            {!lead?.phone && <p className="text-[10px]" style={{ color: '#EF4444' }}>Lead has no phone number</p>}
          </div>
        ) : (
          grouped.map(({ label, msgs }) => (
            <div key={label}>
              {/* Date divider */}
              <div className="flex items-center justify-center my-3">
                <span className="text-[10px] px-3 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(11,20,26,0.8)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {label}
                </span>
              </div>

              {msgs.map(msg => {
                const isOut = msg.direction !== 'inbound'
                const body  = msg.formatted_markdown || msg.message || msg.body || ''
                const hasMedia = !!msg.media_url

                return (
                  <div key={msg.id} className={`flex mb-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
                    <div style={{ maxWidth: '78%' }}>
                      <div className="px-3 py-2 rounded-2xl relative"
                        style={{
                          background:    isOut ? '#005C4B' : '#202C33',
                          borderRadius:  isOut ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          boxShadow:     '0 1px 3px rgba(0,0,0,0.3)',
                        }}>
                        {/* Media */}
                        {hasMedia && <MediaContent msg={msg} />}

                        {/* Text body */}
                        {body && (
                          <div className="text-sm leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            dangerouslySetInnerHTML={{ __html: renderWAText(body) }} />
                        )}

                        {/* Time row */}
                        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <TypeTag type={msg.message_type} />
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            {timeStr(msg.sent_at || msg.created_at)}
                          </span>
                          {isOut && <Ticks status={msg.status} />}
                        </div>
                      </div>
                      {msg.status === 'failed' && msg.error_message && (
                        <p className="text-[9px] px-2 mt-0.5" style={{ color: '#EF4444' }}>{msg.error_message}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose area ── */}
      {lead?.phone && (
        <div className="flex-shrink-0" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '8px 10px' }}>

          {/* Media preview */}
          {media && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {media.type === 'image'
                ? <Image size={16} style={{ color: '#25D366' }} />
                : media.type === 'video'
                ? <Video size={16} style={{ color: '#0EA5E9' }} />
                : <FileText size={16} style={{ color: '#F59E0B' }} />}
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{media.name}</span>
              <button onClick={() => setMedia(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={13} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          )}

          {/* Format shortcut bar */}
          <div className="flex items-center gap-1 mb-1.5">
            {[
              { label: 'B', action: () => insertWrap('*', '*'), style: 'font-bold' },
              { label: 'I', action: () => insertWrap('_', '_'), style: 'italic' },
              { label: 'S', action: () => insertWrap('~', '~'), style: 'line-through' },
            ].map(({ label, action, style }) => (
              <button key={label} onMouseDown={e => { e.preventDefault(); action() }}
                className="w-6 h-6 rounded flex items-center justify-center text-[11px] transition-all"
                style={{ color: 'var(--text-secondary)', textDecoration: label === 'S' ? 'line-through' : 'none', fontStyle: label === 'I' ? 'italic' : 'normal', fontWeight: label === 'B' ? 700 : 400, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
            <span className="text-[9px] ml-1" style={{ color: 'var(--text-muted)' }}>
              Ctrl+B · Ctrl+I · Shift+Enter=newline
            </span>
          </div>

          {/* Main input row */}
          <div className="flex items-end gap-2">
            {/* Emoji */}
            <div className="relative">
              <button onClick={() => setShowEmoji(s => !s)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Smile size={18} />
              </button>
              {showEmoji && (
                <div className="emoji-panel">
                  <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
                </div>
              )}
            </div>

            {/* File attach */}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {uploading
                ? <Loader size={16} className="animate-spin" style={{ color: '#25D366' }} />
                : <Paperclip size={16} />
              }
            </button>
            <input ref={fileInputRef} type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden" onChange={handleFileSelect} />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={compose}
              onChange={e => setCompose(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 text-sm rounded-2xl px-3 py-2 resize-none outline-none"
              style={{
                background: 'var(--bg-secondary)',
                color:      'var(--text-primary)',
                border:     '1px solid var(--border)',
                maxHeight:  120,
                minHeight:  36,
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />

            {/* Send button */}
            <button onClick={handleSend} disabled={sending || (!compose.trim() && !media)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: (compose.trim() || media) && !sending ? '#25D366' : 'var(--bg-secondary)', border: 'none', cursor: 'pointer' }}>
              {sending
                ? <Loader size={16} className="animate-spin" style={{ color: '#fff' }} />
                : <Send size={16} style={{ color: (compose.trim() || media) ? '#fff' : 'var(--text-muted)' }} />}
            </button>
          </div>

          {/* Close emoji on outside click */}
          {showEmoji && (
            <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
          )}
        </div>
      )}

      {!lead?.phone && (
        <div className="px-3 py-2 flex-shrink-0 text-center" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: '#EF4444' }}>No phone number — add phone to send WA messages</p>
        </div>
      )}
    </div>
  )
}
