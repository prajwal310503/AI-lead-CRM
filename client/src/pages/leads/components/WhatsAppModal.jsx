import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Wand2, Copy, CheckCheck } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { openWhatsApp, copyToClipboard } from '../../../utils/helpers'
import toast from 'react-hot-toast'

const TEMPLATES = [
  { label: 'Quick Intro', text: `Hi {name}! I'm Deepak from StartWeb. We help businesses like {business} build a strong online presence. Can we connect for 5 mins?` },
  { label: 'Website Pitch', text: `Hi {name}! Noticed {business} doesn't have a website. We build professional websites starting ₹15,000. Interested? We've helped 50+ local businesses!` },
  { label: 'GMB Offer', text: `Hi {name}! Your Google listing for {business} can attract 3x more customers. We manage GMB professionally. Want a free audit?` },
  { label: 'Follow-up', text: `Hi {name}! Following up on {business}. Did you get a chance to review our proposal? Happy to answer any questions!` },
]

export default function WhatsAppModal({ open, onClose, lead }) {
  const [tab, setTab] = useState('ai')
  const [customMsg, setCustomMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const hookMessage = lead?.ai_hook_message || ''
  const getMessage = () => {
    if (tab === 'ai') return hookMessage
    if (tab === 'custom') return customMsg
    return ''
  }

  const replaceVars = (text) =>
    (text || '')
      .replace(/{name}/g, lead?.owner_name || lead?.business_name || 'there')
      .replace(/{business}/g, lead?.business_name || 'your business')

  const handleSend = () => {
    const msg = replaceVars(getMessage())
    if (!msg) { toast.error('No message to send'); return }
    if (!lead?.phone) { toast.error('No phone number for this lead'); return }
    openWhatsApp(lead.phone, msg)
    toast.success('Opening WhatsApp...')
    onClose()
  }

  const handleCopy = () => {
    const msg = replaceVars(getMessage())
    copyToClipboard(msg)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Outreach" size="md">
      <div className="space-y-4">
        {/* Lead info */}
        {lead && (
          <div className="p-3 rounded-xl glass-emerald">
            <p className="text-sm font-semibold" style={{ color: 'var(--emerald)' }}>{lead.business_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.phone || 'No phone'}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          {[
            { id: 'ai', label: 'AI Hook' },
            { id: 'template', label: 'Templates' },
            { id: 'custom', label: 'Custom' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={{
                background: tab === t.id ? 'var(--bg-glass)' : 'transparent',
                color: tab === t.id ? 'var(--orange)' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* AI Hook */}
        {tab === 'ai' && (
          <div>
            {hookMessage ? (
              <div className="p-3 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {replaceVars(hookMessage)}
              </div>
            ) : (
              <div className="p-3 rounded-xl glass-amber text-sm" style={{ color: 'var(--amber)' }}>
                Run AI Analysis first to generate a personalized hook message.
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {tab === 'template' && (
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => { setCustomMsg(t.text); setTab('custom') }}
                className="w-full text-left p-3 rounded-xl transition-all hover:bg-white/5"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--orange)' }}>{t.label}</p>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{t.text.slice(0, 80)}...</p>
              </button>
            ))}
          </div>
        )}

        {/* Custom */}
        {tab === 'custom' && (
          <textarea
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            placeholder="Type your custom message here... Use {name} and {business} as variables"
            className="input-glass resize-none"
            rows={5}
          />
        )}

        {/* Preview bubble */}
        {getMessage() && (
          <div>
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Preview</p>
            <div className="flex justify-end">
              <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                style={{ background: '#25D366', color: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                {replaceVars(getMessage())}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleCopy} className="btn-ghost flex-1 justify-center">
            {copied ? <CheckCheck size={16} style={{ color: 'var(--emerald)' }} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleSend} disabled={!getMessage() || !lead?.phone} className="btn-primary flex-1 justify-center">
            <Send size={16} /> Send via WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  )
}
