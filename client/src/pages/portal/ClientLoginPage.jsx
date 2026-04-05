import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, User, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import axios from 'axios'

export default function ClientLoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', token: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/portal/login`, form)
      localStorage.setItem('portal-token', data.token)
      localStorage.setItem('portal-client', JSON.stringify(data.client))
      navigate('/portal/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.4) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4"
      >
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--blue)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Client Portal</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>StartWeb · Secure Access</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 glass-crimson">
              <AlertCircle size={15} style={{ color: 'var(--crimson)' }} />
              <span className="text-sm" style={{ color: 'var(--crimson)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-glass pl-10" placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Portal Token</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="password" required value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} className="input-glass pl-10" placeholder="Enter your access token" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary justify-center" style={{ background: 'var(--blue)', padding: '12px' }}>
              {loading ? 'Signing in...' : <><ArrowRight size={15} /> Access Portal</>}
            </button>
          </form>
          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
            Contact StartWeb if you need your access token
          </p>
        </div>
      </motion.div>
    </div>
  )
}
