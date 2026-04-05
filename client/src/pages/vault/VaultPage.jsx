import { useState, useEffect } from 'react'
import { Lock, Plus, Search, Eye, EyeOff, Copy, ExternalLink, Folder, Upload, Trash2, CheckCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import { copyToClipboard } from '../../utils/helpers'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const CATEGORY_COLORS = {
  hosting: '#3B82F6', domain: '#8B5CF6', social: '#EC4899', cms: '#10B981',
  ads: '#F97316', email: '#0EA5E9', ftp: '#6366F1', analytics: '#14B8A6',
  payment: '#22C55E', other: '#94A3B8',
}

export default function VaultPage() {
  const { user, profile } = useAuthStore()
  const [selectedClient, setSelectedClient] = useState(null)
  const [clients, setClients] = useState([])
  const [showPasswords, setShowPasswords] = useState({})
  const [copied, setCopied] = useState({})
  const [credModalOpen, setCredModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      setClients(data || [])
      if (data?.[0]) setSelectedClient(data[0])
    })
  }, [])

  const { data: credentials = [], refetch: refetchCreds } = useQuery({
    queryKey: ['vault_credentials', selectedClient?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vault_credentials').select('*').eq('client_id', selectedClient.id).order('category')
      if (error) throw error
      return data
    },
    enabled: !!selectedClient,
  })

  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ['vault_files', selectedClient?.id],
    queryFn: async () => {
      const { data } = await supabase.from('vault_files').select('*').eq('client_id', selectedClient.id).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!selectedClient,
  })

  const filteredCreds = credentials.filter((c) =>
    !search || c.label?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCopy = (id, text, field) => {
    copyToClipboard(text)
    setCopied({ [id + field]: true })
    setTimeout(() => setCopied({}), 2000)
    toast.success('Copied!')
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedClient) return
    const path = `vault/${selectedClient.id}/${Date.now()}_${file.name}`
    const { error: uploadErr } = await supabase.storage.from('vault').upload(path, file)
    if (uploadErr) { toast.error(uploadErr.message); return }
    const { data: urlData } = supabase.storage.from('vault').getPublicUrl(path)
    await supabase.from('vault_files').insert({
      client_id: selectedClient.id, name: file.name, file_url: urlData.publicUrl,
      file_type: file.type, file_size: file.size, uploaded_by: user.id,
    })
    toast.success('File uploaded!')
    refetchFiles()
  }

  return (
    <div className="p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--indigo-light)' }}>
            <Lock size={18} style={{ color: 'var(--indigo)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Vault</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Credentials & files per client</p>
          </div>
        </div>
        <button onClick={() => setCredModalOpen(true)} disabled={!selectedClient} className="btn-primary">
          <Plus size={16} /> Add Credential
        </button>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Client list sidebar */}
        <div className="col-span-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--text-muted)' }}>Clients</p>
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: selectedClient?.id === c.id ? 'var(--orange-light)' : 'transparent',
                color: selectedClient?.id === c.id ? 'var(--orange)' : 'var(--text-secondary)',
                border: `1px solid ${selectedClient?.id === c.id ? 'var(--orange)' : 'transparent'}`,
              }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--indigo)' }}>
                {c.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate">{c.name}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="col-span-9 space-y-4">
          {!selectedClient ? (
            <EmptyState icon={Folder} title="Select a client" description="Choose a client from the left to view their vault" />
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search credentials..." className="input-glass pl-9" />
              </div>

              {/* Credentials */}
              {filteredCreds.length === 0 ? (
                <EmptyState icon={Lock} title="No credentials" description="Add credentials for this client" action={<button onClick={() => setCredModalOpen(true)} className="btn-primary">Add Credential</button>} />
              ) : (
                <div className="space-y-2">
                  {filteredCreds.map((cred) => {
                    const color = CATEGORY_COLORS[cred.category] || '#94A3B8'
                    return (
                      <div key={cred.id} className="glass rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: `${color}20`, color }}>
                              {cred.category}
                            </span>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cred.label}</p>
                              {cred.url && (
                                <a href={cred.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--blue)' }}>
                                  <ExternalLink size={10} /> {cred.url.replace(/^https?:\/\//, '').slice(0, 30)}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          {cred.username && (
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                              <span className="text-xs flex-1 mono truncate" style={{ color: 'var(--text-secondary)' }}>{cred.username}</span>
                              <button onClick={() => handleCopy(cred.id, cred.username, 'u')} className="opacity-60 hover:opacity-100 transition-opacity">
                                {copied[cred.id + 'u'] ? <CheckCheck size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} style={{ color: 'var(--text-muted)' }} />}
                              </button>
                            </div>
                          )}
                          {cred.password && (
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                              <span className="text-xs flex-1 mono" style={{ color: 'var(--text-secondary)' }}>
                                {showPasswords[cred.id] ? cred.password : '••••••••'}
                              </span>
                              <button onClick={() => setShowPasswords((s) => ({ ...s, [cred.id]: !s[cred.id] }))} className="opacity-60 hover:opacity-100 transition-opacity">
                                {showPasswords[cred.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button onClick={() => handleCopy(cred.id, cred.password, 'p')} className="opacity-60 hover:opacity-100 transition-opacity">
                                {copied[cred.id + 'p'] ? <CheckCheck size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} style={{ color: 'var(--text-muted)' }} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Files section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Files ({files.length})</h3>
                  <label className="btn-ghost text-xs cursor-pointer">
                    <Upload size={13} /> Upload File
                    <input type="file" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(f.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <a href={f.file_url} target="_blank" rel="noreferrer" className="text-xs font-medium" style={{ color: 'var(--blue)' }}>Download</a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Credential Modal */}
      {credModalOpen && <AddCredentialModal open={credModalOpen} onClose={() => setCredModalOpen(false)} clientId={selectedClient?.id} onSaved={() => { refetchCreds(); setCredModalOpen(false) }} />}
    </div>
  )
}

function AddCredentialModal({ open, onClose, clientId, onSaved }) {
  const { user } = useAuthStore()
  const [form, setForm] = useState({ label: '', category: 'hosting', url: '', username: '', password: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('vault_credentials').insert({
      ...form, client_id: clientId, created_by: user.id, visible_to: ['admin'],
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Credential saved!')
    onSaved()
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Credential">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Label *</label>
          <input value={form.label} onChange={(e) => set('label', e.target.value)} required className="input-glass" placeholder="e.g. cPanel Login" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input-glass">
            {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>URL</label>
          <input value={form.url} onChange={(e) => set('url', e.target.value)} className="input-glass" type="url" placeholder="https://" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Username/Email</label>
            <input value={form.username} onChange={(e) => set('username', e.target.value)} className="input-glass" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
            <input value={form.password} onChange={(e) => set('password', e.target.value)} className="input-glass" type="password" />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save Credential'}</button>
        </div>
      </form>
    </Modal>
  )
}
