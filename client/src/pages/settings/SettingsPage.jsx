import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, MessageSquare, Mail, Building2, Save, Eye, EyeOff, CheckCircle, Package, Plus, Trash2, Edit2, Zap, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import useSettingsStore from '../../stores/useSettingsStore'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const TABS = [
  { id: 'ai', label: 'AI Models', icon: Brain },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'email', label: 'Email / SMTP', icon: Mail },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'services', label: 'Services', icon: Package },
]

const PRICE_TYPES = ['fixed', 'monthly', 'per_page', 'custom']

const AI_PROVIDERS = [
  { id: 'claude', label: 'Claude (Anthropic)', models: ['claude-opus-4-6','claude-sonnet-4-6','claude-haiku-4-5-20251001'], color: '#FF6B35' },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o','gpt-4o-mini','gpt-4-turbo'], color: '#10B981' },
  { id: 'gemini', label: 'Google Gemini', models: ['gemini-1.5-pro','gemini-1.5-flash'], color: '#0EA5E9' },
  { id: 'openrouter', label: 'OpenRouter', models: ['anthropic/claude-3.5-sonnet','openai/gpt-4o','meta-llama/llama-3.1-70b-instruct'], color: '#8B5CF6' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('ai')
  const { user } = useAuthStore()
  const settings = useSettingsStore()
  const [showKeys, setShowKeys] = useState({})
  const [webhookUrl, setWebhookUrl] = useState(
    () => `${window.location.origin.replace(':5173', ':5000')}/api/whatsapp/webhook`
  )
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState('')  // 'ai' | 'wa' | 'email' | ''

  // Services catalog state
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [editingSvc, setEditingSvc] = useState(null)
  const [newSvc, setNewSvc] = useState({ name: '', description: '', base_price: '', price_type: 'fixed', is_active: true })
  const [showNewSvc, setShowNewSvc] = useState(false)

  useEffect(() => {
    if (tab === 'services') loadServices()
  }, [tab])

  const loadServices = async () => {
    setServicesLoading(true)
    const { data } = await supabase.from('services').select('*').order('sort_order').order('created_at')
    setServices(data || [])
    setServicesLoading(false)
  }

  const saveService = async (svc) => {
    if (!svc.name || !svc.base_price) { toast.error('Name and price are required'); return }
    const payload = { ...svc, base_price: parseFloat(svc.base_price) }
    if (svc.id) {
      const { error } = await supabase.from('services').update(payload).eq('id', svc.id)
      if (error) { toast.error(error.message); return }
      toast.success('Service updated')
      setEditingSvc(null)
    } else {
      const { error } = await supabase.from('services').insert(payload)
      if (error) { toast.error(error.message); return }
      toast.success('Service added')
      setNewSvc({ name: '', description: '', base_price: '', price_type: 'fixed', is_active: true })
      setShowNewSvc(false)
    }
    loadServices()
  }

  const deleteService = async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Service deleted')
    loadServices()
  }

  const toggleActive = async (svc) => {
    await supabase.from('services').update({ is_active: !svc.is_active }).eq('id', svc.id)
    loadServices()
  }

  const testAI = async () => {
    setTesting('ai')
    try {
      await save()
      const { data } = await api.post('/api/settings/test-ai')
      toast.success(`AI connected! Provider: ${data.provider} / ${data.model}`)
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally { setTesting('') }
  }

  const testWA = async () => {
    setTesting('wa')
    try {
      await save()
      const { data } = await api.post('/api/settings/test-wa')
      toast.success(data.message || 'WhatsApp test sent!')
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally { setTesting('') }
  }

  const testEmail = async () => {
    setTesting('email')
    try {
      await save()
      const { data } = await api.post('/api/settings/test-email')
      toast.success(data.message || 'Test email sent!')
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally { setTesting('') }
  }

  const save = async () => {
    setSaving(true)
    try {
      // Include apify_token + serpapi_key inside api_keys JSONB so they're saved
      // even if dedicated columns don't exist in the DB yet.
      const mergedApiKeys = {
        ...settings.apiKeys,
        google_places: settings.googlePlacesKey || '',
        apify_token:   settings.apifyToken       || '',
        serpapi_key:   settings.serpapiKey        || '',
      }
      const { data: saved } = await api.put('/api/settings', {
        active_provider:   settings.activeProvider,
        active_model:      settings.activeModel,
        api_keys:          mergedApiKeys,
        apify_token:       settings.apifyToken  || null,
        serpapi_key:       settings.serpapiKey   || null,
        default_location:  settings.defaultLocation,
        max_leads:         settings.maxLeads,
        whatsapp_enabled:    settings.whatsappEnabled,
        wa_provider:         settings.waProvider,
        twilio_account_sid:  settings.twilioAccountSid,
        twilio_auth_token:   settings.twilioAuthToken,
        twilio_from:         settings.twilioFrom,
        aisensy_api_key:     settings.aiSensyApiKey,
        aisensy_sender_id:   settings.aiSensySenderId,
        meta_phone_id:       settings.metaPhoneId,
        meta_access_token:   settings.metaAccessToken,
        meta_verify_token:   settings.metaVerifyToken,
        wa_auto_intro:       settings.waAutoIntro,
        wa_followup_enabled: settings.waFollowupEnabled,
        smtp_host:         settings.smtpHost,
        smtp_port:         Number(settings.smtpPort) || 587,
        smtp_user:         settings.smtpUser,
        smtp_pass:         settings.smtpPass,
        smtp_from_name:    settings.smtpFromName,
        company_name:      settings.companyName,
        company_email:     settings.companyEmail,
        company_phone:     settings.companyPhone,
        company_website:   settings.companyWebsite,
        company_city:      settings.companyCity,
        company_address:   settings.companyAddress,
        gst_number:        settings.gstNumber,
        upi_id:            settings.upiId,
        bank_name:         settings.bankName,
        account_number:    settings.accountNumber,
        ifsc_code:         settings.ifscCode,
        account_name:      settings.accountName,
        invoice_prefix:    settings.invoicePrefix,
        default_tax:       Number(settings.defaultTax) || 18,
        payment_terms:     settings.paymentTerms,
      })
      if (saved?._partial) {
        toast.success('API keys saved! (Run the Supabase SQL to save all settings)')
      } else {
        toast.success('Settings saved!')
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.message || ''
      if (msg.includes('permission denied') || msg.includes('does not exist')) {
        toast.error('Permission denied — run the SQL fix in Supabase (open Lead Discovery → Verify API Keys → Copy SQL)', { duration: 8000 })
      } else {
        toast.error('Save failed: ' + msg)
      }
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure your workspace, AI, and integrations</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all justify-center"
            style={{
              background: tab === t.id ? 'var(--bg-glass)' : 'transparent',
              color: tab === t.id ? 'var(--orange)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? 'var(--shadow-card)' : 'none',
            }}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

        {/* AI Models Tab */}
        {tab === 'ai' && (
          <>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>AI Provider</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { settings.setProvider(p.id, p.models[1]); }}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                    style={{
                      borderColor: settings.activeProvider === p.id ? p.color : 'var(--border)',
                      background: settings.activeProvider === p.id ? `${p.color}10` : 'transparent',
                    }}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.label}</p>
                    </div>
                    {settings.activeProvider === p.id && <CheckCircle size={14} className="ml-auto" style={{ color: p.color }} />}
                  </button>
                ))}
              </div>

              {/* Model selector */}
              {AI_PROVIDERS.filter((p) => p.id === settings.activeProvider).map((p) => (
                <div key={p.id}>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Model</label>
                  <select
                    className="input-glass"
                    value={settings.activeModel}
                    onChange={(e) => settings.setProvider(settings.activeProvider, e.target.value)}
                  >
                    {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>API Keys</h3>
              <div className="space-y-4">
                {AI_PROVIDERS.map((p) => (
                  <div key={p.id}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      {p.label} API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys[p.id] ? 'text' : 'password'}
                        value={settings.apiKeys[p.id] || ''}
                        onChange={(e) => settings.setApiKey(p.id, e.target.value)}
                        placeholder={`Enter ${p.label} API key`}
                        className="input-glass pr-10 mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys((s) => ({ ...s, [p.id]: !s[p.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                      >
                        {showKeys[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={testAI}
                disabled={!!testing}
                className="btn-ghost text-sm"
                style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
              >
                {testing === 'ai' ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
                {testing === 'ai' ? 'Testing...' : 'Test AI Connection'}
              </button>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Lead Discovery</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'SerpAPI Key', key: 'serpapiKey', placeholder: 'Get free key at serpapi.com' },
                  { label: 'Google Places API Key', key: 'googlePlacesKey', placeholder: 'Get free key at console.cloud.google.com' },
                  { label: 'Apify Token', key: 'apifyToken', placeholder: 'Get token at apify.com' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input
                      type="password"
                      value={settings[key] || ''}
                      onChange={(e) => useSettingsStore.setState({ [key]: e.target.value })}
                      placeholder={placeholder}
                      className="input-glass mono text-xs"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Default Location</label>
                  <input
                    type="text"
                    value={settings.defaultLocation}
                    onChange={(e) => useSettingsStore.setState({ defaultLocation: e.target.value })}
                    className="input-glass"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Leads per Search</label>
                  <input
                    type="number"
                    value={settings.maxLeads ?? 20}
                    onChange={(e) => useSettingsStore.setState({ maxLeads: parseInt(e.target.value) || 20 })}
                    className="input-glass"
                    min={5} max={100}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* WhatsApp Tab */}
        {tab === 'whatsapp' && (
          <div className="space-y-4">
            {/* Enable + Provider selector */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>WhatsApp Messaging</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose your WhatsApp provider and configure credentials</p>
                </div>
                <label className="relative inline-flex cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={settings.whatsappEnabled}
                    onChange={(e) => useSettingsStore.setState({ whatsappEnabled: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-10 h-5 rounded-full transition-all"
                    style={{ background: settings.whatsappEnabled ? 'var(--orange)' : 'var(--border)' }}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${settings.whatsappEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </div>

              {/* Provider cards */}
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Select Provider</p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  {
                    id: 'meta',
                    label: 'Meta Cloud API',
                    desc: 'Free official WhatsApp API by Meta',
                    color: '#1877F2',
                    logo: '🔵',
                  },
                  {
                    id: 'twilio',
                    label: 'Twilio',
                    desc: 'Enterprise-grade SMS & WhatsApp API',
                    color: '#F22F46',
                    logo: '🔴',
                  },
                  {
                    id: 'aisensy',
                    label: 'AiSensy',
                    desc: 'WhatsApp Business API platform',
                    color: '#25D366',
                    logo: '🟢',
                  },
                ].map((p) => {
                  const active = settings.waProvider === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => useSettingsStore.setState({ waProvider: p.id })}
                      className="text-left p-4 rounded-xl border transition-all"
                      style={{
                        borderColor: active ? p.color : 'var(--border)',
                        background: active ? `${p.color}10` : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{p.logo}</span>
                        {active && <CheckCircle size={14} style={{ color: p.color }} />}
                      </div>
                      <p className="text-sm font-bold" style={{ color: active ? p.color : 'var(--text-primary)' }}>{p.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Meta Cloud API fields */}
              {settings.waProvider === 'meta' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone Number ID</label>
                      <input type="text" value={settings.metaPhoneId}
                        onChange={(e) => useSettingsStore.setState({ metaPhoneId: e.target.value })}
                        placeholder="e.g. 123456789012345" className="input-glass mono text-xs" />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>From Meta Developer App → WhatsApp → API Setup</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Permanent Access Token</label>
                      <div className="relative">
                        <input type={showKeys.metaToken ? 'text' : 'password'} value={settings.metaAccessToken}
                          onChange={(e) => useSettingsStore.setState({ metaAccessToken: e.target.value })}
                          placeholder="EAAxxxxxxxxxxxxxxxx..." className="input-glass mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowKeys((s) => ({ ...s, metaToken: !s.metaToken }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                          {showKeys.metaToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Use a System User token for permanent access (doesn't expire)</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Webhook Verify Token</label>
                      <input type="text" value={settings.metaVerifyToken}
                        onChange={(e) => useSettingsStore.setState({ metaVerifyToken: e.target.value })}
                        placeholder="any secret string you choose" className="input-glass text-xs" />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Used to verify your webhook with Meta</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Webhook URL</label>
                      <div className="flex gap-2">
                        <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://your-server.com/api/whatsapp/webhook"
                          className="input-glass text-xs flex-1" />
                        <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}
                          className="btn-ghost text-xs px-3 py-2">Copy</button>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Change to your production domain when deploying (e.g. https://api.yoursite.com/api/whatsapp/webhook)</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(24,119,242,0.08)', border: '1px solid rgba(24,119,242,0.3)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: '#1877F2' }}>Setup (Free):</strong> Go to <strong>developers.facebook.com</strong> → Create App → Business → Add WhatsApp product → Get Phone Number ID + Temporary Token → Create a System User for permanent token → Paste Webhook URL above in Meta App → WhatsApp → Configuration → Webhook. Subscribe to <strong>messages</strong> event.
                    </p>
                  </div>
                </div>
              )}

              {/* Twilio fields */}
              {settings.waProvider === 'twilio' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Account SID</label>
                      <input type="text" value={settings.twilioAccountSid}
                        onChange={(e) => useSettingsStore.setState({ twilioAccountSid: e.target.value })}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="input-glass mono text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Auth Token</label>
                      <div className="relative">
                        <input type={showKeys.twilioAuth ? 'text' : 'password'} value={settings.twilioAuthToken}
                          onChange={(e) => useSettingsStore.setState({ twilioAuthToken: e.target.value })}
                          placeholder="••••••••••••••••••••••••••••••••" className="input-glass mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowKeys((s) => ({ ...s, twilioAuth: !s.twilioAuth }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                          {showKeys.twilioAuth ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>From Number (WhatsApp)</label>
                      <input type="text" value={settings.twilioFrom}
                        onChange={(e) => useSettingsStore.setState({ twilioFrom: e.target.value })}
                        placeholder="+14155238886" className="input-glass" />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Include country code, e.g. +14155238886</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Webhook URL</label>
                      <div className="flex gap-2">
                        <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://your-server.com/api/whatsapp/webhook"
                          className="input-glass text-xs flex-1" />
                        <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}
                          className="btn-ghost text-xs px-3 py-2">Copy</button>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Change to your production domain when deploying (e.g. https://api.yoursite.com/api/whatsapp/webhook)</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Setup:</strong> Go to console.twilio.com → WhatsApp → Sandbox (test) or request production access.
                      Paste the Webhook URL above in your Twilio WhatsApp Sandbox settings under "When a message comes in".
                    </p>
                  </div>
                </div>
              )}

              {/* AiSensy fields */}
              {settings.waProvider === 'aisensy' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>API Key</label>
                      <div className="relative">
                        <input type={showKeys.aiSensyKey ? 'text' : 'password'} value={settings.aiSensyApiKey}
                          onChange={(e) => useSettingsStore.setState({ aiSensyApiKey: e.target.value })}
                          placeholder="Enter AiSensy API Key" className="input-glass mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowKeys((s) => ({ ...s, aiSensyKey: !s.aiSensyKey }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                          {showKeys.aiSensyKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Sender ID / Campaign Name</label>
                      <input type="text" value={settings.aiSensySenderId}
                        onChange={(e) => useSettingsStore.setState({ aiSensySenderId: e.target.value })}
                        placeholder="e.g. StartWeb_Intro" className="input-glass" />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>The campaign or sender ID from your AiSensy dashboard</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Webhook URL</label>
                      <div className="flex gap-2">
                        <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://your-server.com/api/whatsapp/webhook"
                          className="input-glass text-xs flex-1" />
                        <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}
                          className="btn-ghost text-xs px-3 py-2">Copy</button>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Change to your production domain when deploying (e.g. https://api.yoursite.com/api/whatsapp/webhook)</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Setup:</strong> Go to app.aisensy.com → Settings → Developer API.
                      Copy your API Key and add the Webhook URL above under Webhook settings to receive incoming messages.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button onClick={testWA} disabled={!!testing}
                  className="btn-ghost text-sm" style={{ borderColor: '#25D366', color: '#25D366' }}>
                  {testing === 'wa' ? <Loader size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                  {testing === 'wa' ? 'Sending...' : 'Send Test Message'}
                </button>
              </div>
            </div>

            {/* Intro Engine settings */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Service Introduction Engine</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Auto-send AI-personalized intro when a new lead is added</p>

              <div className="space-y-3">
                {/* Auto intro toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Auto Intro on Lead Add</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lead Created → AI Personalized Intro → Send WhatsApp</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={settings.waAutoIntro}
                      onChange={(e) => useSettingsStore.setState({ waAutoIntro: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-10 h-5 rounded-full transition-all"
                      style={{ background: settings.waAutoIntro ? 'var(--emerald)' : 'var(--border)' }}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${settings.waAutoIntro ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                {/* Follow-up toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Auto Follow-up (Day 3 / 7 / 14)</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>If no reply, send follow-up at Day 3, Day 7, Day 14 (9AM IST)</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={settings.waFollowupEnabled}
                      onChange={(e) => useSettingsStore.setState({ waFollowupEnabled: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-10 h-5 rounded-full transition-all"
                      style={{ background: settings.waFollowupEnabled ? 'var(--emerald)' : 'var(--border)' }}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${settings.waFollowupEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              </div>

              {/* Workflow visual */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Workflow</p>
                <div className="flex items-center gap-1 flex-wrap text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {['Lead Added', '→', 'AI Generates Intro', '→', 'Send WhatsApp', '→', 'Wait for Reply'].map((step, i) => (
                    <span key={i} className={step === '→' ? '' : 'px-2 py-0.5 rounded-full'}
                      style={step !== '→' ? { background: 'var(--orange-light)', color: 'var(--orange)' } : {}}>
                      {step}
                    </span>
                  ))}
                  <br />
                  <span className="w-full mt-1" />
                  {['Reply Received', '→', 'Mark Interested', '→', 'Notify Admin', '|', 'No Reply', '→', 'Day 3/7/14 Follow-up'].map((step, i) => (
                    <span key={i} className={['→', '|'].includes(step) ? '' : 'px-2 py-0.5 rounded-full'}
                      style={!['→', '|'].includes(step) ? { background: step.includes('No') ? 'rgba(239,68,68,0.1)' : 'var(--emerald-light,rgba(16,185,129,0.1))', color: step.includes('No') ? 'var(--crimson)' : 'var(--emerald)' } : {}}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {tab === 'email' && (
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>SMTP Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'SMTP Host', key: 'smtpHost', type: 'text', placeholder: 'smtp.gmail.com' },
                { label: 'SMTP Port', key: 'smtpPort', type: 'number', placeholder: '587' },
                { label: 'SMTP User (Email)', key: 'smtpUser', type: 'email', placeholder: 'your@gmail.com' },
                { label: 'SMTP Password / App Password', key: 'smtpPass', type: 'password', placeholder: '••••••••' },
                { label: 'From Name', key: 'smtpFromName', type: 'text', placeholder: 'StartWeb' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className={key === 'smtpFromName' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    type={type}
                    value={type === 'number' ? (settings[key] ?? '') : (settings[key] || '')}
                    onChange={(e) => {
                      const raw = e.target.value
                      const val = type === 'number' ? (raw === '' ? '' : parseInt(raw) || 0) : raw
                      useSettingsStore.setState({ [key]: val })
                    }}
                    placeholder={placeholder}
                    className="input-glass"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl glass-amber">
              <p className="text-xs" style={{ color: 'var(--amber)' }}>
                For Gmail: Use an App Password (Google Account → Security → 2-Step Verification → App Passwords)
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={testEmail}
                disabled={!!testing}
                className="btn-ghost text-sm"
                style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}
              >
                {testing === 'email' ? <Loader size={14} className="animate-spin" /> : <Mail size={14} />}
                {testing === 'email' ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        )}

        {/* Company Tab */}
        {tab === 'company' && (
          <>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Company Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Company Name', key: 'companyName' },
                  { label: 'Company Email', key: 'companyEmail', type: 'email' },
                  { label: 'Phone', key: 'companyPhone' },
                  { label: 'Website', key: 'companyWebsite', type: 'url' },
                  { label: 'City', key: 'companyCity' },
                  { label: 'GST Number', key: 'gstNumber' },
                ].map(({ label, key, type = 'text' }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input
                      type={type}
                      value={settings[key] || ''}
                      onChange={(e) => useSettingsStore.setState({ [key]: e.target.value })}
                      className="input-glass"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Address</label>
                  <textarea
                    value={settings.companyAddress || ''}
                    onChange={(e) => useSettingsStore.setState({ companyAddress: e.target.value })}
                    rows={2}
                    className="input-glass resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'UPI ID', key: 'upiId' },
                  { label: 'Bank Name', key: 'bankName' },
                  { label: 'Account Number', key: 'accountNumber' },
                  { label: 'IFSC Code', key: 'ifscCode' },
                  { label: 'Account Name', key: 'accountName' },
                  { label: 'Invoice Prefix', key: 'invoicePrefix' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={(e) => useSettingsStore.setState({ [key]: e.target.value })}
                      className="input-glass"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Default GST %</label>
                  <input
                    type="number"
                    value={settings.defaultTax ?? 18}
                    onChange={(e) => useSettingsStore.setState({ defaultTax: parseFloat(e.target.value) || 18 })}
                    className="input-glass"
                    step={0.5}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Payment Terms</label>
                  <input
                    type="text"
                    value={settings.paymentTerms || ''}
                    onChange={(e) => useSettingsStore.setState({ paymentTerms: e.target.value })}
                    className="input-glass"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Services Catalog Tab */}
        {tab === 'services' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Services Catalog</h3>
                <button onClick={() => setShowNewSvc(true)} className="btn-primary text-sm py-1.5 px-3">
                  <Plus size={14} /> Add Service
                </button>
              </div>

              {/* New service form */}
              {showNewSvc && (
                <div className="p-4 rounded-xl mb-4 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--orange)' }}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--orange)' }}>New Service</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Service Name *</label>
                      <input value={newSvc.name} onChange={(e) => setNewSvc((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Website Design" className="input-glass" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Base Price (₹) *</label>
                      <input type="number" value={newSvc.base_price} onChange={(e) => setNewSvc((s) => ({ ...s, base_price: e.target.value }))} placeholder="15000" className="input-glass" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Price Type</label>
                      <select value={newSvc.price_type} onChange={(e) => setNewSvc((s) => ({ ...s, price_type: e.target.value }))} className="input-glass">
                        {PRICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
                      <input value={newSvc.description} onChange={(e) => setNewSvc((s) => ({ ...s, description: e.target.value }))} placeholder="Short description" className="input-glass" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveService(newSvc)} className="btn-primary text-sm py-1.5 px-3">Save</button>
                    <button onClick={() => setShowNewSvc(false)} className="btn-ghost text-sm py-1.5 px-3">Cancel</button>
                  </div>
                </div>
              )}

              {servicesLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
              ) : services.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No services yet. Add your first service.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((svc) => (
                    <div key={svc.id}>
                      {editingSvc?.id === svc.id ? (
                        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--blue)' }}>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="col-span-2">
                              <input value={editingSvc.name} onChange={(e) => setEditingSvc((s) => ({ ...s, name: e.target.value }))} className="input-glass" />
                            </div>
                            <input type="number" value={editingSvc.base_price} onChange={(e) => setEditingSvc((s) => ({ ...s, base_price: e.target.value }))} className="input-glass" />
                            <select value={editingSvc.price_type} onChange={(e) => setEditingSvc((s) => ({ ...s, price_type: e.target.value }))} className="input-glass">
                              {PRICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="col-span-2">
                              <input value={editingSvc.description || ''} onChange={(e) => setEditingSvc((s) => ({ ...s, description: e.target.value }))} placeholder="Description" className="input-glass" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveService(editingSvc)} className="btn-primary text-sm py-1.5 px-3">Update</button>
                            <button onClick={() => setEditingSvc(null)} className="btn-ghost text-sm py-1.5 px-3">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5" style={{ border: '1px solid var(--border)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate" style={{ color: svc.is_active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{svc.name}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>{svc.price_type}</span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{svc.description || 'No description'}</p>
                          </div>
                          <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--emerald)' }}>
                            ₹{parseFloat(svc.base_price).toLocaleString('en-IN')}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => toggleActive(svc)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title={svc.is_active ? 'Deactivate' : 'Activate'}>
                              <span className="w-2 h-2 rounded-full" style={{ background: svc.is_active ? 'var(--emerald)' : 'var(--text-muted)' }} />
                            </button>
                            <button onClick={() => setEditingSvc({ ...svc })} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                              <Edit2 size={12} style={{ color: 'var(--blue)' }} />
                            </button>
                            <button onClick={() => deleteService(svc.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                              <Trash2 size={12} style={{ color: 'var(--crimson)' }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  )
}
