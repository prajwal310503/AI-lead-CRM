import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../lib/supabase'

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [invite, setInvite] = useState(null)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchInvite()
  }, [token])

  const fetchInvite = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/team/invite/${token}`)
      setInvite(data)
    } catch {
      setError('Invalid or expired invitation link.')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/team/accept-invite`, {
        token, password: form.password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invitation')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4"
      >
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--orange)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Join StartWebOS
            </h1>
          </div>

          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--emerald)' }} />
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Account created!</h3>
              <p style={{ color: 'var(--text-muted)' }}>Redirecting to login...</p>
            </div>
          ) : (
            <>
              {invite && (
                <div className="p-3 rounded-xl mb-4 glass-blue">
                  <p className="text-sm font-medium" style={{ color: 'var(--blue)' }}>
                    Invited as <strong>{invite.name}</strong> · {invite.role}
                  </p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4 glass-crimson">
                  <AlertCircle size={16} style={{ color: 'var(--crimson)' }} />
                  <span className="text-sm" style={{ color: 'var(--crimson)' }}>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 8 characters"
                      className="input-glass pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      placeholder="Repeat password"
                      className="input-glass pl-10"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary justify-center">
                  {loading ? 'Creating account...' : 'Accept & Set Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
