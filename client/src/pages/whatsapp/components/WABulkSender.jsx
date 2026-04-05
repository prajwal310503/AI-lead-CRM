import { useState, useRef, useMemo } from 'react'
import {
  Send, Loader, CheckSquare, Square, Search, Users, Paperclip,
  Smile, X, Image, Video, FileText, AlertCircle, CheckCircle,
  Zap, BarChart2, Eye, ChevronLeft, ChevronRight
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../stores/useAuthStore'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

// ── WA Markdown inline renderer (for preview only) ───────────────────────
function renderWA(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<code style="font-family:monospace;background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br/>')
}

const STATUS_ICONS = {
  pending: null,
  sending: <Loader size={11} className="animate-spin" style={{ color: '#F59E0B' }} />,
  sent:    <CheckCircle size={11} style={{ color: '#10B981' }} />,
  failed:  <AlertCircle size={11} style={{ color: '#EF4444' }} />,
  skipped: <AlertCircle size={11} style={{ color: '#6B7280' }} />,
}

const EMOJIS = [
  '😊','😄','🙏','👍','🚀','🔥','💪','✅','⚡','🎯','💡','🌟','📈','💼','📱',
  '🪔','🎆','🎊','🎉','🥳','❤️','🌹','🌺','🎁','🎀','🌸','✨','⭐','🏆','💎',
]

const BS_PAGE_SIZE = 50

function EmojiPicker({ onSelect }) {
  return (
    <div className="absolute bottom-full right-0 mb-1 z-50 p-2 rounded-xl shadow-2xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: 230 }}>
      <div className="grid grid-cols-10 gap-1">
        {EMOJIS.map(e => (
          <button key={e} type="button" onClick={() => onSelect(e)}
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

export default function WABulkSender({ leads, onSendComplete }) {
  const { user } = useAuthStore()
  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)

  const [search, setSearch]           = useState('')
  const [tab, setTab]                 = useState('not_contacted') // 'all' | 'not_contacted'
  const [selected, setSelected]       = useState(new Set())
  const [compose, setCompose]         = useState('')
  const [media, setMedia]             = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [showEmoji, setShowEmoji]     = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending]         = useState(false)
  const [sendLog, setSendLog]         = useState({}) // leadId → 'pending' | 'sending' | 'sent' | 'failed'
  const [sentCount, setSentCount]     = useState(0)
  const [errorCount, setErrorCount]   = useState(0)
  const [page, setPage]               = useState(1)

  // ── Filtered lead list ─────────────────────────────────────────────────
  const filtered = useMemo(() => leads.filter(l => {
    const matchSearch = !search ||
      l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.city?.toLowerCase().includes(search.toLowerCase())
    const matchTab = tab === 'all' ? true : !l.whatsapp_intro_sent
    return matchSearch && matchTab && !!l.phone
  }), [leads, search, tab])

  const totalPages   = Math.max(1, Math.ceil(filtered.length / BS_PAGE_SIZE))
  const pagedLeads   = filtered.slice((page - 1) * BS_PAGE_SIZE, page * BS_PAGE_SIZE)

  const resetPage = (val, setter) => { setter(val); setPage(1) }

  const toggleLead = (id) => {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(l => l.id)))
    }
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  const insertWrap = (open, close) => {
    const ta = textareaRef.current
    if (!ta) return
    const s = ta.selectionStart, en = ta.selectionEnd
    const selected_ = compose.substring(s, en)
    setCompose(compose.substring(0, s) + open + selected_ + close + compose.substring(en))
    setTimeout(() => { ta.focus(); ta.selectionStart = s + open.length; ta.selectionEnd = en + open.length }, 0)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.target.selectionStart !== e.target.selectionEnd) {
      if (e.key === 'b') { e.preventDefault(); insertWrap('*', '*') }
      if (e.key === 'i') { e.preventDefault(); insertWrap('_', '_') }
    }
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

  // ── Media upload ───────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 16 * 1024 * 1024) { toast.error('File too large (max 16 MB)'); return }
    setUploading(true)
    try {
      const path = `whatsapp/bulk_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { error } = await supabase.storage.from('vault').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('vault').getPublicUrl(path)
      const mtype = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : 'document'
      setMedia({ url: urlData.publicUrl, type: mtype, name: file.name, mime: file.type })
      toast.success(`${mtype} ready to attach`)
    } catch (e) { toast.error('Upload failed: ' + e.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  // ── Bulk send ──────────────────────────────────────────────────────────
  const handleBulkSend = async () => {
    if (!compose.trim() && !media) { toast.error('Write a message first'); return }
    if (!selected.size)            { toast.error('Select at least one lead'); return }

    const targets = filtered.filter(l => selected.has(l.id))
    const initialLog = {}
    targets.forEach(l => { initialLog[l.id] = 'pending' })
    setSendLog(initialLog)
    setSending(true)
    setSentCount(0)
    setErrorCount(0)

    let sent = 0, failed = 0

    for (const lead of targets) {
      setSendLog(prev => ({ ...prev, [lead.id]: 'sending' }))
      try {
        await api.post(`/api/whatsapp/send/${lead.id}`, {
          message:            compose.trim() || `[${media?.type}]`,
          formatted_markdown: compose.trim(),
          media_url:          media?.url  || null,
          media_type:         media?.type || null,
          media_filename:     media?.name || null,
          media_mime:         media?.mime || null,
        })
        setSendLog(prev => ({ ...prev, [lead.id]: 'sent' }))
        setSentCount(++sent)
      } catch (e) {
        setSendLog(prev => ({ ...prev, [lead.id]: 'failed' }))
        setErrorCount(++failed)
      }
      if (lead !== targets[targets.length - 1]) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    setSending(false)
    toast.success(`Bulk send complete — ${sent} sent, ${failed} failed`)
    onSendComplete?.()
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const hasContent  = compose.trim() || media

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>

      {/* ── Left: Lead selector ── */}
      <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>

        {/* Header */}
        <div style={{ padding: '0.65rem 0.75rem 0.5rem', flexShrink: 0 }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} style={{ color: '#25D366' }} />
            Select Recipients
            {selected.size > 0 && (
              <span style={{ marginLeft: 'auto', padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(37,211,102,0.15)', color: '#25D366' }}>
                {selected.size} selected
              </span>
            )}
          </p>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 3, marginBottom: '0.5rem', padding: '0.2rem', borderRadius: 9, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            {[
              { id: 'not_contacted', label: 'Not Contacted' },
              { id: 'all',           label: 'All Leads' },
            ].map(t => (
              <button key={t.id} onClick={() => { resetPage(t.id, setTab); setSelected(new Set()) }}
                style={{ flex: 1, padding: '0.3rem 0.4rem', borderRadius: 7, border: 'none', background: tab === t.id ? '#25D366' : 'transparent', color: tab === t.id ? '#0b1117' : 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
            <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => resetPage(e.target.value, setSearch)}
              placeholder="Search leads across all pages…"
              style={{ width: '100%', borderRadius: 9, paddingLeft: 26, paddingRight: 10, paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.73rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Select all */}
          {filtered.length > 0 && (
            <button onClick={toggleAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 600, padding: '0.25rem 0.35rem', borderRadius: 7, border: 'none', background: 'transparent', color: allSelected ? '#25D366' : 'var(--text-muted)', cursor: 'pointer', width: '100%', transition: 'all 0.15s' }}>
              {allSelected
                ? <CheckSquare size={13} style={{ color: '#25D366' }} />
                : <Square size={13} style={{ color: 'var(--text-muted)' }} />}
              {allSelected ? `Deselect all (${filtered.length})` : `Select all (${filtered.length})`}
            </button>
          )}
        </div>

        {/* Pagination bar */}
        {filtered.length > BS_PAGE_SIZE && (
          <div style={{ padding: '0.3rem 0.6rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, background: 'var(--bg-card)' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '0.15rem 0.35rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.65rem', opacity: page === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={10} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: '0.15rem 0.35rem', background: p === page ? 'var(--orange)' : 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, color: p === page ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: p === page ? 700 : 400, minWidth: 22, textAlign: 'center' }}>{p}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '0.15rem 0.35rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '0.65rem', opacity: page >= totalPages ? 0.4 : 1 }}>
              <ChevronRight size={10} />
            </button>
            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {(page-1)*BS_PAGE_SIZE+1}–{Math.min(page*BS_PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
          </div>
        )}

        {/* Lead list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {tab === 'not_contacted' ? 'Everyone has been contacted!' : 'No leads found'}
              </p>
            </div>
          ) : (
            pagedLeads.map(lead => {
              const isSel  = selected.has(lead.id)
              const status = sendLog[lead.id]
              return (
                <div key={lead.id}
                  onClick={() => !sending && toggleLead(lead.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    background:  isSel ? 'rgba(37,211,102,0.07)' : 'transparent',
                    borderLeft:  isSel ? '2px solid #25D366' : '2px solid transparent',
                    borderBottom: '1px solid var(--border)',
                    transition: 'all 0.1s',
                  }}>
                  {/* Checkbox */}
                  <div style={{ flexShrink: 0 }}>
                    {sending && status
                      ? STATUS_ICONS[status] || <Square size={13} style={{ color: 'var(--text-muted)' }} />
                      : isSel
                        ? <CheckSquare size={14} style={{ color: '#25D366' }} />
                        : <Square size={14} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: isSel ? '#0b1117' : 'var(--text-primary)', background: isSel ? '#25D366' : 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {lead.business_name?.[0]?.toUpperCase() || '?'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isSel ? '#25D366' : 'var(--text-primary)' }}>
                      {lead.business_name || lead.owner_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {lead.phone || 'No phone'}{lead.city ? ` · ${lead.city}` : ''}
                    </p>
                  </div>

                  {lead.whatsapp_intro_sent && (
                    <span style={{ fontSize: '0.6rem', padding: '0.08rem 0.4rem', borderRadius: 20, flexShrink: 0, background: 'rgba(255,107,53,0.15)', color: 'var(--orange)' }}>
                      Sent ✓
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: Compose + Preview ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-card)' }}>

        {/* Compose header */}
        <div style={{ padding: '0.7rem 1rem 0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Zap size={14} style={{ color: '#25D366' }} />
            Compose Broadcast Message
          </p>
          <button onClick={() => setShowPreview(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: showPreview ? 'rgba(37,211,102,0.12)' : 'var(--bg-secondary)', color: showPreview ? '#25D366' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            <Eye size={11} /> {showPreview ? 'Hide Preview' : 'WA Preview'}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

          {/* Compose panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.75rem 1rem', minWidth: 0 }}>

            {/* Format shortcuts */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', marginRight: 3, color: 'var(--text-muted)', fontWeight: 600 }}>FORMAT:</span>
              {[
                { label: 'B',    tip: 'Bold (Ctrl+B)',   action: () => insertWrap('*', '*'),     style: { fontWeight: 700 } },
                { label: 'I',    tip: 'Italic (Ctrl+I)', action: () => insertWrap('_', '_'),     style: { fontStyle: 'italic' } },
                { label: 'S',    tip: 'Strikethrough',   action: () => insertWrap('~', '~'),     style: { textDecoration: 'line-through' } },
                { label: '```',  tip: 'Monospace',       action: () => insertWrap('```', '```'), style: { fontFamily: 'monospace', fontSize: 10 } },
              ].map(({ label, tip, action, style: s }) => (
                <button key={label} type="button"
                  onMouseDown={e => { e.preventDefault(); action() }}
                  title={tip}
                  style={{ padding: '0.18rem 0.45rem', borderRadius: 5, fontSize: '0.72rem', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s', ...s }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={compose}
              onChange={e => setCompose(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here...&#10;&#10;Use *bold*, _italic_, ~strike~&#10;&#10;Example:&#10;Hello! We're *StartWeb* 🚀&#10;• Website Design&#10;• SEO Services"
              style={{
                flex: 1, borderRadius: 10, padding: '0.75rem', fontSize: '0.88rem', resize: 'none', outline: 'none',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                lineHeight: 1.7, minHeight: 160, fontFamily: 'inherit',
              }}
            />

            {/* Media attachment */}
            {media && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: '0.5rem', padding: '0.45rem 0.75rem', borderRadius: 9, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)' }}>
                {media.type === 'image' ? <Image size={14} style={{ color: '#25D366' }} />
                  : media.type === 'video' ? <Video size={14} style={{ color: '#0EA5E9' }} />
                  : <FileText size={14} style={{ color: '#F59E0B' }} />}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.name}</span>
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 20, background: 'var(--bg-secondary)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{media.type}</span>
                <button onClick={() => setMedia(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <X size={13} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            )}

            {/* Bottom toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: '0.65rem' }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowEmoji(s => !s)}
                  style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Smile size={16} />
                </button>
                {showEmoji && (
                  <>
                    <EmojiPicker onSelect={insertEmoji} />
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowEmoji(false)} />
                  </>
                )}
              </div>

              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {uploading
                  ? <Loader size={14} className="animate-spin" style={{ color: '#25D366' }} />
                  : <Paperclip size={14} />}
              </button>
              <input ref={fileInputRef} type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                style={{ display: 'none' }} onChange={handleFileSelect} />

              <span style={{ fontSize: '0.68rem', flex: 1, textAlign: 'right', paddingRight: 3, color: 'var(--text-muted)' }}>
                {compose.length} chars
              </span>
            </div>

            {/* Send progress or send button */}
            {sending ? (
              <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 10, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#25D366' }}>Sending messages…</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {sentCount + errorCount} / {selected.size}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 5, overflow: 'hidden', background: 'var(--border)' }}>
                  <div style={{ height: '100%', borderRadius: 5, transition: 'width 0.4s', width: `${((sentCount + errorCount) / selected.size) * 100}%`, background: '#25D366' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: '0.4rem', fontSize: '0.68rem' }}>
                  <span style={{ color: '#10B981' }}>✓ {sentCount} sent</span>
                  {errorCount > 0 && <span style={{ color: '#EF4444' }}>✗ {errorCount} failed</span>}
                  <span style={{ color: 'var(--text-muted)' }}>~1.5s between each</span>
                </div>
              </div>
            ) : (
              <button onClick={handleBulkSend} disabled={!hasContent || !selected.size}
                style={{
                  marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '0.6rem', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: hasContent && selected.size ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                  background: hasContent && selected.size ? '#25D366' : 'var(--bg-secondary)',
                  color:      hasContent && selected.size ? '#0b1117' : 'var(--text-muted)',
                }}>
                <Send size={15} />
                Send to {selected.size || 0} Lead{selected.size !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* Preview panel — intentionally WA dark themed */}
          {showPreview && (
            <div style={{ width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', padding: '0.75rem', background: 'var(--bg-secondary)' }}>
              <p style={{ margin: '0 0 0.65rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Eye size={11} style={{ color: '#25D366' }} /> WA Preview
              </p>
              {/* Mock WA bubble */}
              <div style={{ borderRadius: 10, padding: '0.5rem', background: '#0d1b21' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '92%', padding: '0.55rem 0.75rem', background: '#005C4B', borderRadius: '12px 12px 2px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
                    {media && (
                      <div style={{ marginBottom: 6, borderRadius: 8, overflow: 'hidden', maxWidth: 180 }}>
                        {media.type === 'image'
                          ? <img src={media.url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                          : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.08)' }}>
                              <FileText size={14} style={{ color: media.type === 'video' ? '#0EA5E9' : '#F59E0B' }} />
                              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.name}</span>
                            </div>
                          )}
                      </div>
                    )}
                    {compose.trim() ? (
                      <div style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.92)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: renderWA(compose) }} />
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Your message appears here...</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 3 }}>
                      <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>now</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {Object.keys(sendLog).length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <BarChart2 size={11} style={{ color: '#25D366' }} /> Send Status
                  </p>
                  {Object.entries(sendLog).slice(0, 8).map(([id, status]) => {
                    const lead_ = leads.find(l => l.id === id)
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: status === 'sent' ? '#10B981' : status === 'failed' ? '#EF4444' : status === 'sending' ? '#F59E0B' : 'var(--border)' }} />
                        <span style={{ fontSize: '0.68rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                          {lead_?.business_name || id.slice(0, 8)}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: status === 'sent' ? '#10B981' : status === 'failed' ? '#EF4444' : 'var(--text-muted)' }}>
                          {status}
                        </span>
                      </div>
                    )
                  })}
                  {Object.keys(sendLog).length > 8 && (
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{Object.keys(sendLog).length - 8} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
