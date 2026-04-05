import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ScrollText, CheckSquare, Send, PenTool, Edit2, Lock,
  User, DollarSign, Calendar, Clock, Shield, FileText, AlertTriangle,
  Briefcase, ChevronRight
} from 'lucide-react'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import { formatDate } from '../../../utils/format'
import ESignPanel from './ESignPanel'

const STATUS_CONFIG = {
  draft:            { label: 'Draft',              color: 'var(--text-muted)',  bg: 'var(--bg-secondary)' },
  sent:             { label: 'Sent for Signature', color: 'var(--blue)',        bg: '#0EA5E915' },
  partially_signed: { label: 'Partial Signature',  color: 'var(--amber)',      bg: '#F59E0B15' },
  fully_signed:     { label: 'Fully Signed',       color: 'var(--emerald)',     bg: '#10B98115' },
  expired:          { label: 'Expired',            color: '#EF4444',            bg: '#EF444415' },
  cancelled:        { label: 'Cancelled',          color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
}

// Section display definitions
const SECTION_DEFS = [
  { key: 'scope',          label: 'Scope of Work',   icon: Briefcase,   color: 'var(--orange)' },
  { key: 'deliverables',   label: 'Deliverables',    icon: CheckSquare, color: 'var(--emerald)' },
  { key: 'timeline',       label: 'Timeline',        icon: Calendar,    color: 'var(--blue)' },
  { key: 'payment_terms',  label: 'Payment Terms',   icon: DollarSign,  color: 'var(--purple)' },
  { key: 'ip_ownership',   label: 'IP Ownership',    icon: Shield,      color: 'var(--amber)' },
  { key: 'confidentiality',label: 'Confidentiality', icon: Lock,        color: '#0EA5E9' },
  { key: 'termination',    label: 'Termination',     icon: AlertTriangle, color: '#EF4444' },
]

function SectionBlock({ def, value, isLocked, onEdit }) {
  const { label, icon: Icon, color, key } = def
  if (!value) return null
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: `${color}12` }}>
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        </div>
        {!isLocked && (
          <button onClick={() => onEdit(key, value)} className="p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100">
            <Edit2 size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>
      <div className="px-3 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
        <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{value}</p>
      </div>
    </div>
  )
}

function SignatureBox({ label, signedAt, signatureData, isYou, isLocked, onSign }) {
  const [showPanel, setShowPanel] = useState(false)

  const handleSign = (dataUrl, method) => {
    setShowPanel(false)
    onSign(dataUrl, method)
  }

  return (
    <div className="rounded-xl p-3" style={{
      border: `1px solid ${signedAt ? 'var(--emerald)' : 'var(--border)'}`,
      background: signedAt ? '#10B98110' : 'var(--bg-secondary)',
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <User size={12} style={{ color: signedAt ? 'var(--emerald)' : 'var(--text-muted)' }} />
          <span className="text-xs font-bold" style={{ color: signedAt ? 'var(--emerald)' : 'var(--text-muted)' }}>
            {label}
          </span>
        </div>
        {signedAt
          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#10B98120', color: '#10B981' }}>Signed</span>
          : <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pending</span>
        }
      </div>

      {signedAt && (
        <>
          {signatureData?.startsWith('data:image') ? (
            <div className="rounded-lg p-2 mb-1.5" style={{ background: 'white' }}>
              <img src={signatureData} alt="Signature" className="h-12 mx-auto" />
            </div>
          ) : signatureData ? (
            <p className="text-base mb-1.5 pl-1" style={{ fontFamily: 'cursive', color: '#1a1a1a' }}>{signatureData}</p>
          ) : null}
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            Signed {formatDate(signedAt)}
          </p>
        </>
      )}

      {!signedAt && !isLocked && isYou && (
        <>
          {showPanel ? (
            <ESignPanel
              signerLabel={`Sign as ${label}`}
              onSign={handleSign}
              onCancel={() => setShowPanel(false)}
            />
          ) : (
            <button onClick={() => setShowPanel(true)} className="btn-primary w-full justify-center text-xs mt-1 gap-1.5">
              <PenTool size={12} /> Sign Now
            </button>
          )}
        </>
      )}

      {!signedAt && !isLocked && !isYou && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Awaiting client signature
        </p>
      )}
    </div>
  )
}

export default function AgreementDetailModal({ agreement: initial, onClose, onUpdated }) {
  const [agreement, setAgreement] = useState(initial)
  const [activeTab, setActiveTab] = useState('document') // 'document' | 'signatures' | 'log'
  const [signing, setSigning]     = useState(false)
  const [sending, setSending]     = useState(false)

  // Inline section editing
  const [editingKey, setEditingKey]     = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [editSaving, setEditSaving]     = useState(false)

  const sc       = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.draft
  const isLocked = agreement.is_locked || agreement.status === 'fully_signed'
  const agencySigned = !!agreement.your_signed_at
  const clientSigned = !!agreement.client_signed_at

  // Get structured sections (prefer sections JSONB, fallback to flat fields)
  const sections = agreement.sections || {
    scope:           agreement.scope          || '',
    deliverables:    agreement.deliverables   || '',
    timeline:        agreement.timeline       || '',
    payment_terms:   agreement.payment_terms  || '',
    ip_ownership:    agreement.ip_ownership   || '',
    confidentiality: agreement.confidentiality || '',
    termination:     agreement.termination    || '',
  }

  const signLog = Array.isArray(agreement.sign_log) ? agreement.sign_log : []

  const handleSign = async (signer, signatureData, method) => {
    setSigning(true)
    try {
      const { data } = await api.patch(`/api/agreements/${agreement.id}/sign`, {
        signer,
        signature: signatureData,
        method,
      })
      setAgreement(data)
      onUpdated?.(data)
      toast.success(`${signer === 'agency' ? 'Agency' : 'Client'} signature added!`)
      if (data.status === 'fully_signed') {
        toast.success('Agreement fully signed! Project and Invoice triggered.')
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setSigning(false)
    }
  }

  const handleMarkSent = async () => {
    setSending(true)
    try {
      const { data } = await api.put(`/api/agreements/${agreement.id}`, { status: 'sent' })
      setAgreement(data)
      onUpdated?.(data)
      toast.success('Agreement sent for signature!')
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setSending(false)
    }
  }

  const startEdit = (key, value) => {
    setEditingKey(key)
    setEditingValue(value)
  }

  const saveEdit = async () => {
    setEditSaving(true)
    try {
      const updatedSections = { ...sections, [editingKey]: editingValue }
      const payload = {
        sections: updatedSections,
        [editingKey]: editingValue, // flat field compat
      }
      const { data } = await api.put(`/api/agreements/${agreement.id}`, payload)
      setAgreement(data)
      onUpdated?.(data)
      setEditingKey(null)
      toast.success('Section updated')
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="glass rounded-2xl w-full max-w-4xl flex flex-col"
        style={{ border: '1px solid var(--border)', height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.15)' }}>
            <ScrollText size={17} style={{ color: '#8B5CF6' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {agreement.title}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              {isLocked && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#10B98120', color: '#10B981' }}>
                  <Lock size={9} /> Locked
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {agreement.client_name} · {agreement.agreement_number}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {agreement.status === 'draft' && (
              <button onClick={handleMarkSent} disabled={sending}
                className="btn-ghost text-xs px-3 py-1.5 gap-1.5"
                style={{ color: 'var(--blue)' }}>
                <Send size={12} /> {sending ? 'Sending...' : 'Send to Client'}
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/10">
              <X size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-0 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          {[
            { id: 'document',   label: 'Document' },
            { id: 'signatures', label: `Signatures ${agencySigned && clientSigned ? '✓' : `(${(agencySigned ? 1 : 0) + (clientSigned ? 1 : 0)}/2)`}` },
            { id: 'log',        label: `Audit Log (${signLog.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="px-5 py-2.5 text-xs font-semibold border-b-2 transition-all"
              style={{
                borderBottomColor: activeTab === t.id ? 'var(--orange)' : 'transparent',
                color: activeTab === t.id ? 'var(--orange)' : 'var(--text-muted)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Document tab */}
          {activeTab === 'document' && (
            <div className="p-5 space-y-3">
              {/* Metadata row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: User,      label: 'Client',   value: agreement.client_name },
                  { icon: DollarSign,label: 'Value',    value: agreement.total_value ? `₹${Number(agreement.total_value).toLocaleString('en-IN')}` : agreement.total_amount ? `₹${Number(agreement.total_amount).toLocaleString('en-IN')}` : '—' },
                  { icon: Calendar,  label: 'Created',  value: formatDate(agreement.created_at) },
                  { icon: Clock,     label: 'Payment',  value: sections.payment_terms?.split('\n')[0]?.slice(0, 30) || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-[9px] uppercase tracking-wider flex items-center gap-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Icon size={9} /> {label}
                    </p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* 7 Sections */}
              {SECTION_DEFS.map(def => {
                const value = sections[def.key]
                if (editingKey === def.key) {
                  return (
                    <div key={def.key} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${def.color}` }}>
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: `${def.color}12` }}>
                        <def.icon size={13} style={{ color: def.color }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: def.color }}>{def.label}</span>
                      </div>
                      <div className="p-3 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
                        <textarea
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          className="input-glass resize-none w-full text-sm"
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} disabled={editSaving} className="btn-primary text-xs px-3 py-1.5">
                            {editSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingKey(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                        </div>
                      </div>
                    </div>
                  )
                }
                return (
                  <SectionBlock
                    key={def.key}
                    def={def}
                    value={value || agreement.terms_content}
                    isLocked={isLocked || agreement.status !== 'draft'}
                    onEdit={startEdit}
                  />
                )
              })}

              {/* Fallback: flat terms_content */}
              {!Object.values(sections).some(Boolean) && agreement.terms_content && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Terms & Conditions</p>
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {agreement.terms_content}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Signatures tab */}
          {activeTab === 'signatures' && (
            <div className="p-5 space-y-4">

              {isLocked && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#10B98115', border: '1px solid #10B98130' }}>
                  <Lock size={16} style={{ color: '#10B981' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#10B981' }}>Agreement Locked</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Both parties have signed. Document is immutable.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SignatureBox
                  label="StartWeb (Agency)"
                  signedAt={agreement.your_signed_at}
                  signatureData={agreement.your_signature}
                  isYou={true}
                  isLocked={isLocked}
                  onSign={(data, method) => handleSign('agency', data, method)}
                />
                <SignatureBox
                  label={agreement.client_name || 'Client'}
                  signedAt={agreement.client_signed_at}
                  signatureData={agreement.client_signature}
                  isYou={false}
                  isLocked={isLocked}
                  onSign={(data, method) => handleSign('client', data, method)}
                />
              </div>

              {/* Progress indicator */}
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${((agencySigned ? 1 : 0) + (clientSigned ? 1 : 0)) * 50}%`,
                        background: isLocked ? '#10B981' : 'var(--orange)',
                      }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: isLocked ? '#10B981' : 'var(--orange)' }}>
                    {(agencySigned ? 1 : 0) + (clientSigned ? 1 : 0)}/2 signed
                  </span>
                </div>
                {!isLocked && (agencySigned || clientSigned) && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Waiting for {!agencySigned ? 'agency' : 'client'} signature to finalise
                  </p>
                )}
                {isLocked && (
                  <p className="text-xs" style={{ color: '#10B981' }}>
                    Fully executed — document locked on {formatDate(agreement.client_signed_at || agreement.your_signed_at)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Audit Log tab */}
          {activeTab === 'log' && (
            <div className="p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Signature Audit Trail
              </p>
              {signLog.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No signature events yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {signLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#10B98120' }}>
                        <PenTool size={11} style={{ color: '#10B981' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {entry.signer === 'agency' ? 'Agency' : 'Client'} signed via {entry.method || 'unknown'}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {entry.timestamp ? formatDate(entry.timestamp) : ''}
                          {entry.ip ? ` · IP: ${entry.ip}` : ''}
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#10B98120', color: '#10B981' }}>
                        {entry.method || 'draw'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Agreement metadata */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Agreement Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Number: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{agreement.agreement_number || '—'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Created: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatDate(agreement.created_at)}</span>
                  </div>
                  {agreement.your_signed_at && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Agency signed: </span>
                      <span style={{ color: '#10B981' }}>{formatDate(agreement.your_signed_at)}</span>
                    </div>
                  )}
                  {agreement.client_signed_at && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Client signed: </span>
                      <span style={{ color: '#10B981' }}>{formatDate(agreement.client_signed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  )
}
