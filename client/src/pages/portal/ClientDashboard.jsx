import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderOpen, CheckSquare, CreditCard, FileText, LogOut, Zap, Download, QrCode } from 'lucide-react'
import { formatCurrency, formatDate, timeAgo } from '../../utils/format'
import { supabase } from '../../lib/supabase'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('portal-token')
    const clientData = localStorage.getItem('portal-client')
    if (!token || !clientData) { navigate('/client-login'); return }
    const c = JSON.parse(clientData)
    setClient(c)
    fetchData(c.id)
  }, [])

  const fetchData = async (clientId) => {
    const [projectsRes, invoicesRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('client_id', clientId).order('deadline').limit(10),
    ])
    setProjects(projectsRes.data || [])
    setInvoices(invoicesRes.data || [])
    setTasks(tasksRes.data || [])
  }

  const handleLogout = () => {
    localStorage.removeItem('portal-token')
    localStorage.removeItem('portal-client')
    navigate('/client-login')
  }

  const totalProgress = tasks.length ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0
  const totalDue = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount_due || 0), 0)

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="glass h-14 flex items-center justify-between px-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>StartWebOS · Client Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{client.name}</span>
          <button onClick={handleLogout} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
            <LogOut size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </header>

      <main className="p-5 max-w-4xl mx-auto space-y-5">
        {/* Welcome */}
        <div className="glass rounded-2xl p-5" style={{ borderLeft: '3px solid var(--blue)' }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome, {client.name}!</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Here's an overview of your projects and invoices</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Projects', value: projects.filter((p) => p.status === 'active').length, color: 'var(--blue)', icon: FolderOpen },
            { label: 'Tasks Progress', value: `${totalProgress}%`, color: 'var(--emerald)', icon: CheckSquare },
            { label: 'Total Billed', value: formatCurrency(invoices.reduce((s, i) => s + (i.total || 0), 0)), color: 'var(--purple)', icon: CreditCard },
            { label: 'Amount Due', value: formatCurrency(totalDue), color: totalDue > 0 ? 'var(--crimson)' : 'var(--emerald)', icon: FileText },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} style={{ color: s.color }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
              <p className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Your Projects</h3>
          {projects.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No projects yet</p>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{p.status.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${p.progress || 0}%`, background: 'var(--blue)' }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'var(--blue)' }}>{p.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Invoices</h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No invoices</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mono" style={{ color: 'var(--text-primary)' }}>{inv.invoice_number}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due: {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: inv.status === 'paid' ? 'var(--emerald)' : 'var(--crimson)' }}>{formatCurrency(inv.total)}</p>
                    <span className="text-xs capitalize" style={{ color: inv.status === 'paid' ? 'var(--emerald)' : 'var(--amber)' }}>{inv.status}</span>
                  </div>
                  {inv.status !== 'paid' && (
                    <button
                      onClick={() => window.open(`upi://pay?pa=${inv.upi_id}&am=${inv.amount_due}&cu=INR&tn=Invoice ${inv.invoice_number}`, '_blank')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: 'var(--blue)' }}
                    >
                      Pay Now
                    </button>
                  )}
                  {inv.pdf_url && (
                    <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                      <Download size={14} style={{ color: 'var(--text-muted)' }} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
