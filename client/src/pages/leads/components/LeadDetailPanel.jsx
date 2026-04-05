import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, Phone, Mail, Globe, MapPin, Star, BarChart2, Brain,
  MessageSquare, FileText, CheckCircle, AlertCircle, Calendar, Tag,
  Activity, ChevronDown, ChevronUp, Loader, ExternalLink, Heart, Download,
  Edit2, Copy, Instagram, Facebook, Linkedin, Youtube, Twitter, Link2,
  TrendingUp, Target, Zap, DollarSign, Package, Clock
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../stores/useAuthStore'
import useSettingsStore from '../../../stores/useSettingsStore'
import useLeadsStore from '../../../stores/useLeadsStore'
import EditLeadModal from './EditLeadModal'
import ScoreBadge from '../../../components/ui/ScoreBadge'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { callAI, parseJSONResponse, buildLeadAnalysisPrompt } from '../../../lib/ai'
import { formatDate, timeAgo, scoreColor, getArea } from '../../../utils/format'
import { openWhatsApp } from '../../../utils/helpers'
import { generateLeadReportPDF } from '../../../utils/generateLeadReportPDF'
import toast from 'react-hot-toast'

const SECTIONS = ['contact', 'scores', 'analysis', 'activity']

export default function LeadDetailPanel({ lead: initialLead, onClose }) {
  const { user } = useAuthStore()
  const settings = useSettingsStore()
  const { upsertLead } = useLeadsStore()
  const qc = useQueryClient()

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['leads'] })
    qc.invalidateQueries({ queryKey: ['crm-leads'] })
    qc.invalidateQueries({ queryKey: ['leads-interested'] })
    qc.invalidateQueries({ queryKey: ['leads-lost'] })
    qc.invalidateQueries({ queryKey: ['leads-working'] })
    qc.invalidateQueries({ queryKey: ['leads-closed'] })
    qc.invalidateQueries({ queryKey: ['hot-leads-dash'] })
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [qc])
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [section, setSection] = useState('contact')
  const [followupDate, setFollowupDate] = useState(lead?.next_followup_date || '')
  const [editOpen, setEditOpen] = useState(false)

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`)).catch(() => toast.error('Copy failed'))
  }

  // Full address (including shop no.) shown only inside the detail panel
  const fullAddress = lead?.location || lead?.address || null

  // Clean area for the panel header — "Karanjade, Panvel, Navi Mumbai" (3 parts max)
  const headerArea = getArea(lead, 3)

  useEffect(() => {
    setLead(initialLead)
    setFollowupDate(initialLead?.next_followup_date || '')
    if (initialLead?.id) fetchActivities(initialLead.id)
  }, [initialLead])

  const fetchActivities = async (id) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    setActivities(data || [])
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const prompt = buildLeadAnalysisPrompt(lead)
      const response = await callAI(prompt)
      const parsed = parseJSONResponse(response)
      if (!parsed) throw new Error('Failed to parse AI response')

      // Ensure numeric fields are proper integers
      const missedRevenue = parsed.missed_revenue_estimate
        ? (typeof parsed.missed_revenue_estimate === 'number'
            ? Math.round(parsed.missed_revenue_estimate)
            : parseInt(String(parsed.missed_revenue_estimate).replace(/[^\d]/g, ''), 10) || null)
        : null

      const updates = {
        health_score:            Math.min(100, Math.max(0, parseInt(parsed.health_score) || 0)),
        website_score:           Math.min(100, Math.max(0, parseInt(parsed.website_score) || 0)),
        gmb_score:               Math.min(100, Math.max(0, parseInt(parsed.gmb_score) || 0)),
        social_score:            Math.min(100, Math.max(0, parseInt(parsed.social_score) || 0)),
        seo_score:               Math.min(100, Math.max(0, parseInt(parsed.seo_score) || 0)),
        competitor_score:        Math.min(100, Math.max(0, parseInt(parsed.competitor_score) || 0)),
        pain_points:             parsed.pain_points || [],
        opportunities:           parsed.opportunities || [],
        ai_hook_message:         parsed.ai_hook_message || null,
        analysis_summary:        parsed.analysis_summary || null,
        recommended_services:    parsed.recommended_services || [],
        ideal_package:           parsed.ideal_package || null,
        missed_revenue_estimate: missedRevenue,
        deal_probability:        Math.min(100, Math.max(0, parseInt(parsed.deal_probability) || 0)),
        urgency_level:           parsed.urgency_level || null,
        negotiation_risk_level:  parsed.negotiation_risk_level || null,
        service_pitch:           parsed.service_pitch || null,
        is_analysed:             true,
        updated_at:              new Date().toISOString(),
      }

      const { data, error } = await supabase.from('leads').update(updates).eq('id', lead.id).select().single()
      if (error) throw error

      // Log activity
      await supabase.from('lead_activities').insert({
        lead_id: lead.id, user_id: user.id, type: 'analyzed',
        title: 'AI Analysis Completed',
        description: `Health score: ${parsed.health_score}/100`,
      })

      setLead(data)
      upsertLead(data)
      invalidateAll()
      fetchActivities(lead.id)
      setSection('scores')
      toast.success('Analysis complete!')
    } catch (e) {
      toast.error('Analysis failed: ' + e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const markInterested = async () => {
    try {
      // Only set is_interested flag — do NOT change status (has DB CHECK constraint)
      const { data, error } = await supabase.from('leads').update({
        is_interested: true, updated_at: new Date().toISOString()
      }).eq('id', lead.id).select().single()

      if (error) { toast.error('Failed: ' + error.message); return }

      const updated = data || (await supabase.from('leads').select('*').eq('id', lead.id).single()).data
      if (updated) { setLead(updated); upsertLead(updated) }
      invalidateAll()
      toast.success('Lead moved to Interested! 🎯')

      supabase.from('lead_activities').insert({
        lead_id: lead.id, user_id: user?.id, type: 'stage_changed',
        title: 'Marked as Interested', description: 'Lead expressed interest',
      }).then(() => fetchActivities(lead.id))
    } catch (e) {
      console.error('markInterested error:', e)
      toast.error('Something went wrong: ' + e.message)
    }
  }

  const removeInterested = async () => {
    try {
      const { data, error } = await supabase.from('leads').update({
        is_interested: false, updated_at: new Date().toISOString()
      }).eq('id', lead.id).select().single()

      if (error) { toast.error('Failed: ' + error.message); return }

      const updated = data || (await supabase.from('leads').select('*').eq('id', lead.id).single()).data
      if (updated) { setLead(updated); upsertLead(updated) }
      invalidateAll()
      toast.success('Removed from Interested')

      supabase.from('lead_activities').insert({
        lead_id: lead.id, user_id: user?.id, type: 'stage_changed',
        title: 'Removed from Interested', description: 'Interest flag cleared',
      }).then(() => fetchActivities(lead.id))
    } catch (e) {
      console.error('removeInterested error:', e)
      toast.error('Something went wrong: ' + e.message)
    }
  }

  const downloadReport = async () => {
    if (!lead?.is_analysed) {
      toast.error('Run AI analysis first to generate report')
      return
    }
    setGeneratingPDF(true)
    try {
      const company = {
        company_name: settings.companyName || 'StartWeb',
        company_email: settings.companyEmail,
        company_website: settings.companyWebsite,
        company_phone: settings.companyPhone,
        company_address: settings.companyAddress,
      }
      const doc = generateLeadReportPDF(lead, company)
      doc.save(`${lead.business_name?.replace(/\s+/g, '_') || 'lead'}_analysis.pdf`)

      // Log report sent
      await supabase.from('lead_activities').insert({
        lead_id: lead.id, user_id: user.id,
        type: 'report_sent', title: 'Business Analysis Report Downloaded',
        description: '11-page light-theme PDF report generated',
      })
      fetchActivities(lead.id)
      toast.success('Report downloaded!')
    } catch (e) {
      toast.error('PDF generation failed: ' + e.message)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const saveFollowup = async () => {
    if (!followupDate) { toast.error('Please pick a date first'); return }
    try {
      const { data, error } = await supabase.from('leads').update({
        next_followup_date: followupDate, updated_at: new Date().toISOString(),
      }).eq('id', lead.id).select().single()

      if (error) {
        // next_followup_date column might not exist — fall back to just updated_at
        if (error.message?.includes('next_followup_date') || error.message?.includes('column')) {
          console.warn('[FollowUp] next_followup_date column missing:', error.message)
          toast.error('Follow-up column missing. Run the latest DB migration to enable this feature.')
          return
        }
        toast.error('Failed to save: ' + error.message)
        return
      }

      const updated = data || (await supabase.from('leads').select('*').eq('id', lead.id).single()).data
      if (updated) { setLead(updated); upsertLead(updated) }
      invalidateAll()
      toast.success('Follow-up date saved!')
    } catch (e) {
      console.error('[FollowUp] error:', e)
      toast.error('Error saving follow-up: ' + e.message)
    }
  }

  const SCORE_ITEMS = [
    { key: 'health_score',    label: 'Overall Health',       icon: BarChart2,   accent: '#FF6B35' },
    { key: 'website_score',   label: 'Website',              icon: Globe,       accent: '#0EA5E9' },
    { key: 'gmb_score',       label: 'Google My Business',   icon: MapPin,      accent: '#F59E0B' },
    { key: 'social_score',    label: 'Social Media',         icon: Instagram,   accent: '#E1306C' },
    { key: 'seo_score',       label: 'SEO',                  icon: TrendingUp,  accent: '#10B981' },
    { key: 'competitor_score',label: 'Competitor Position',  icon: Target,      accent: '#8B5CF6' },
  ]

  const formatRevenue = (val) => {
    if (!val) return null
    const n = typeof val === 'number' ? val : parseInt(String(val).replace(/[^\d]/g, ''), 10)
    if (!n) return null
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L/mo`
    if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K/mo`
    return `₹${n}/mo`
  }

  const ACTIVITY_STYLE = {
    analyzed:      { color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)',  label: 'AI Analysed' },
    stage_changed: { color: '#FF6B35', bg: 'rgba(255,107,53,0.12)',  label: 'Stage Changed' },
    whatsapp:      { color: '#25D366', bg: 'rgba(37,211,102,0.12)',  label: 'WhatsApp' },
    report_sent:   { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Report Sent' },
    followup:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Follow-up' },
    note:          { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', label: 'Note' },
    created:       { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Created' },
    default:       { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Activity' },
  }

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 w-[640px] max-w-full z-40 flex flex-col"
      style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '-4px 0 40px rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={lead?.status} />
            {lead?.is_priority && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--crimson-light)', color: 'var(--crimson)' }}>PRIORITY</span>}
          </div>
          <h2 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{lead?.business_name}</h2>
          {headerArea && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{headerArea}</p>}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <ScoreBadge score={lead?.health_score} size={52} />
          <button onClick={() => setEditOpen(true)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100" title="Edit lead">
            <Edit2 size={14} style={{ color: 'var(--orange)' }} />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="btn-primary text-xs px-3 py-2"
        >
          {analyzing ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
          {analyzing ? 'Analyzing...' : 'AI Analyze'}
        </button>
        <button
          onClick={() => openWhatsApp(lead?.phone, lead?.ai_hook_message || '')}
          disabled={!lead?.phone}
          className="btn-ghost text-xs px-3 py-2"
          style={{ borderColor: '#25D366', color: '#25D366' }}
        >
          <MessageSquare size={14} /> WhatsApp
        </button>
        <button
          onClick={lead?.is_interested ? removeInterested : markInterested}
          className="btn-ghost text-xs px-3 py-2"
          style={{
            borderColor: 'var(--emerald)',
            color: 'var(--emerald)',
            background: lead?.is_interested ? 'rgba(16,185,129,0.12)' : undefined,
          }}
          title={lead?.is_interested ? 'Click to remove interest' : 'Mark as interested'}
        >
          <Heart size={14} style={lead?.is_interested ? { fill: '#10B981' } : {}} />
          {lead?.is_interested ? 'Interested ✓' : 'Mark Interested'}
        </button>
        <button
          onClick={downloadReport}
          disabled={generatingPDF || !lead?.is_analysed}
          className="btn-ghost text-xs px-3 py-2 ml-auto"
          title={!lead?.is_analysed ? 'Run AI analysis first' : 'Download 11-page light-theme PDF report'}
        >
          {generatingPDF ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          {generatingPDF ? 'Generating...' : 'Report PDF'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'contact', label: 'Contact', icon: Building2 },
          { id: 'scores', label: 'Scores', icon: BarChart2 },
          { id: 'analysis', label: 'Analysis', icon: Brain },
          { id: 'activity', label: 'Activity', icon: Activity },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className="relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all border-b-2"
            style={{
              borderColor: section === t.id ? 'var(--orange)' : 'transparent',
              color: section === t.id ? 'var(--orange)' : 'var(--text-muted)',
            }}
          >
            <t.icon size={13} /> {t.label}
            {t.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2 right-1.5" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {section === 'contact' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Phone, label: 'Phone', value: lead?.phone, href: `tel:${lead?.phone}`, copyable: true },
                { icon: Mail, label: 'Email', value: lead?.email, href: `mailto:${lead?.email}`, copyable: true },
                { icon: Globe, label: 'Website', value: lead?.website, href: lead?.website, copyable: true },
                { icon: MapPin, label: 'Full Address', value: fullAddress, copyable: true },
              ].map(({ icon: Icon, label, value, href, copyable }) => value && (
                <div key={label} className="p-3 rounded-xl group" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    {copyable && (
                      <button
                        onClick={() => copyToClipboard(value, label)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`Copy ${label}`}
                      >
                        <Copy size={11} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    )}
                  </div>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium flex items-center gap-1 hover:underline truncate" style={{ color: 'var(--blue)' }}>
                      <Icon size={12} className="flex-shrink-0" /> <span className="truncate">{value}</span>
                    </a>
                  ) : (
                    <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                      <Icon size={12} className="flex-shrink-0" /> <span className="truncate">{value}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Google info */}
            {(lead?.google_rating || lead?.google_reviews_count) && (
              <div className="p-3 rounded-xl glass-amber">
                <div className="flex items-center gap-3">
                  <Star size={16} style={{ color: 'var(--amber)' }} />
                  <span className="font-bold" style={{ color: 'var(--amber)' }}>{lead.google_rating}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({lead.google_reviews_count} reviews)</span>
                  {lead.gmb_status && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>{lead.gmb_status}</span>}
                </div>
              </div>
            )}

            {/* Digital Presence — all social/digital links as icons */}
            {(() => {
              // GMB Profile: stored Google Maps URL (from Places API) is the direct business page.
              // Fallback: Google search for the business name + city — shows the GMB knowledge panel.
              const gmapUrl = lead?.google_maps_url ||
                (lead?.business_name
                  ? `https://www.google.com/search?q=${encodeURIComponent((lead.business_name + (lead.city ? ' ' + lead.city : '')).trim())}`
                  : null)
              const links = [
                { url: lead?.website, label: 'Website', icon: Globe, color: '#0EA5E9' },
                { url: gmapUrl, label: 'GMB Profile', icon: MapPin, color: '#EA4335' },
                { url: lead?.instagram_url, label: 'Instagram', icon: Instagram, color: '#E1306C' },
                { url: lead?.facebook_url, label: 'Facebook', icon: Facebook, color: '#1877F2' },
                { url: lead?.linkedin_url, label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
                { url: lead?.youtube_url, label: 'YouTube', icon: Youtube, color: '#FF0000' },
                { url: lead?.twitter_url, label: 'X / Twitter', icon: Twitter, color: '#1DA1F2' },
                { url: lead?.phone ? `https://wa.me/91${lead.phone.replace(/\D/g, '')}` : null, label: 'WhatsApp', icon: MessageSquare, color: '#25D366' },
              ].filter(l => l.url)
              if (!links.length) return null
              return (
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Link2 size={12} /> Digital Presence
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {links.map(({ url, label, icon: Icon, color }) => (
                      <a
                        key={label}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noreferrer"
                        title={label}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 hover:scale-105"
                        style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
                      >
                        <Icon size={13} /> {label}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Follow-up config */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Calendar size={14} /> Follow-up Schedule
              </h4>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="input-glass flex-1"
                />
                <button onClick={saveFollowup} className="btn-primary text-xs px-3 py-2">Save</button>
              </div>
            </div>

            {/* Notes */}
            {lead?.notes && (
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>NOTES</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{lead.notes}</p>
              </div>
            )}
          </>
        )}

        {section === 'scores' && (
          <>
            {lead?.health_score ? (
              <div className="space-y-4">
                {/* Summary score cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Deal Probability', val: lead.deal_probability, suffix: '%', color: lead.deal_probability >= 70 ? '#10B981' : lead.deal_probability >= 40 ? '#F59E0B' : '#EF4444', icon: TrendingUp },
                    { label: 'Monthly Lost',     val: formatRevenue(lead.missed_revenue_estimate), suffix: '', color: '#EF4444', icon: DollarSign },
                    { label: 'Urgency',          val: lead.urgency_level?.toUpperCase(), suffix: '', color: lead.urgency_level === 'critical' ? '#EF4444' : lead.urgency_level === 'high' ? '#F59E0B' : '#0EA5E9', icon: Zap },
                  ].map(({ label, val, suffix, color, icon: Icon }) => val != null && (
                    <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <Icon size={14} className="mx-auto mb-1" style={{ color }} />
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-sm font-extrabold mt-0.5" style={{ color }}>{val}{suffix}</p>
                    </div>
                  ))}
                </div>

                {/* Score bars */}
                <div className="space-y-3">
                  {SCORE_ITEMS.map(({ key, label, icon: Icon, accent }) => {
                    const val = lead[key] || 0
                    return (
                      <div key={key} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            <Icon size={12} style={{ color: accent }} /> {label}
                          </span>
                          <span className="text-sm font-extrabold" style={{ color: accent }}>{val}<span className="text-[10px] font-normal text-gray-500">/100</span></span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${accent}99, ${accent})` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Ideal package */}
                {lead.ideal_package && (
                  <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--orange-light)', border: '1px solid var(--orange)30' }}>
                    <Package size={18} style={{ color: 'var(--orange)' }} />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--orange)' }}>Recommended Package</p>
                      <p className="text-sm font-bold capitalize" style={{ color: 'var(--orange)' }}>{lead.ideal_package} Plan</p>
                    </div>
                    {lead.negotiation_risk_level && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {lead.negotiation_risk_level} risk
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain size={40} className="mx-auto mb-3 opacity-40" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No analysis yet. Run AI Analysis to get all 6 scores.</p>
                <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
                  {analyzing ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
                  {analyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
            )}
          </>
        )}

        {section === 'analysis' && (
          <>
            {/* Intelligence summary cards */}
            {lead?.is_analysed && (
              <div className="grid grid-cols-2 gap-2">
                {lead.deal_probability != null && (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <TrendingUp size={10} /> Deal Probability
                    </p>
                    <span className="text-2xl font-extrabold" style={{ color: lead.deal_probability >= 70 ? 'var(--emerald)' : lead.deal_probability >= 40 ? 'var(--amber)' : 'var(--crimson)' }}>
                      {lead.deal_probability}%
                    </span>
                    <div className="h-1.5 rounded-full mt-1.5" style={{ background: 'var(--border)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${lead.deal_probability}%` }} transition={{ duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ background: lead.deal_probability >= 70 ? 'var(--emerald)' : lead.deal_probability >= 40 ? 'var(--amber)' : 'var(--crimson)' }} />
                    </div>
                  </div>
                )}
                {lead.urgency_level && (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Zap size={10} /> Urgency Level
                    </p>
                    <span className="text-xs font-bold px-2.5 py-1.5 rounded-full" style={{
                      background: lead.urgency_level === 'critical' ? 'var(--crimson-light)' : lead.urgency_level === 'high' ? 'var(--amber-light)' : 'var(--blue-light)',
                      color: lead.urgency_level === 'critical' ? 'var(--crimson)' : lead.urgency_level === 'high' ? 'var(--amber)' : 'var(--blue)',
                    }}>{lead.urgency_level?.toUpperCase()}</span>
                  </div>
                )}
                {lead.missed_revenue_estimate && (
                  <div className="p-3 rounded-xl glass-crimson">
                    <p className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--crimson)' }}>
                      <DollarSign size={10} /> Revenue Loss/Month
                    </p>
                    <p className="text-lg font-extrabold" style={{ color: 'var(--crimson)' }}>{formatRevenue(lead.missed_revenue_estimate)}</p>
                    <p className="text-[9px] mt-0.5 opacity-70" style={{ color: 'var(--crimson)' }}>estimated monthly opportunity cost</p>
                  </div>
                )}
                {lead.ideal_package && (
                  <div className="p-3 rounded-xl glass-orange">
                    <p className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--orange)' }}>
                      <Package size={10} /> Ideal Package
                    </p>
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--orange)' }}>{lead.ideal_package} Plan</p>
                    {lead.negotiation_risk_level && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Negotiation risk: {lead.negotiation_risk_level}</p>}
                  </div>
                )}
              </div>
            )}

            {lead?.analysis_summary && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Summary</h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{lead.analysis_summary}</p>
              </div>
            )}
            {lead?.service_pitch && (
              <div className="p-4 rounded-xl glass-orange">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--orange)' }}>Service Pitch</h4>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{lead.service_pitch}</p>
              </div>
            )}
            {lead?.pain_points?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--crimson)' }}>Pain Points</h4>
                <div className="space-y-1.5">
                  {lead.pain_points.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl glass-crimson">
                      <AlertCircle size={13} style={{ color: 'var(--crimson)' }} className="mt-0.5 flex-shrink-0" />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lead?.opportunities?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--emerald)' }}>Opportunities</h4>
                <div className="space-y-1.5">
                  {lead.opportunities.map((o, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl glass-emerald">
                      <CheckCircle size={13} style={{ color: 'var(--emerald)' }} className="mt-0.5 flex-shrink-0" />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Recommended Services */}
            {lead?.recommended_services?.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--blue)' }}>
                  <Package size={13} /> Recommended Services
                </h4>
                <div className="flex flex-wrap gap-2">
                  {lead.recommended_services.map((svc, i) => (
                    <span key={i}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue)30' }}>
                      {svc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {lead?.ai_hook_message && (
              <div className="p-4 rounded-xl glass-blue">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--blue)' }}>
                  <MessageSquare size={13} /> AI Hook Message (WhatsApp)
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{lead.ai_hook_message}</p>
                <button onClick={() => { navigator.clipboard.writeText(lead.ai_hook_message); toast.success('Copied to clipboard!') }}
                  className="mt-2 text-xs flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: 'var(--blue)' }}>
                  <Copy size={11} /> Copy Message
                </button>
              </div>
            )}
            {!lead?.is_analysed && (
              <div className="text-center py-8">
                <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
                  {analyzing ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
                  {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>
            )}
          </>
        )}

        {section === 'activity' && (
          <div>
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={36} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity recorded yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Activities appear here after AI analysis, WhatsApp messages, stage changes</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px" style={{ background: 'var(--border)' }} />
                <div className="space-y-1">
                  {activities.map((a, idx) => {
                    const style = ACTIVITY_STYLE[a.type] || ACTIVITY_STYLE.default
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-start gap-3 pl-1 py-2"
                      >
                        {/* Timeline dot */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                          style={{ background: style.bg, border: `2px solid ${style.color}40` }}>
                          <Activity size={13} style={{ color: style.color }} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                              {a.description && (
                                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{a.description}</p>
                              )}
                            </div>
                            <span className="text-[9px] whitespace-nowrap flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {timeAgo(a.created_at)}
                            </span>
                          </div>
                          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                            style={{ background: style.bg, color: style.color }}>
                            {style.label}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <EditLeadModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={lead}
        onUpdated={(updated) => {
          setLead(updated)
          upsertLead(updated)
        }}
      />
    </motion.aside>
  )
}
