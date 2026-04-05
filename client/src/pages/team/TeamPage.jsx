import { useState, useEffect } from 'react'
import { Users, Plus, Mail, Shield, MoreVertical, UserCheck, UserX } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { timeAgo, formatDate } from '../../utils/format'
import { getInitials } from '../../utils/format'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const ROLES = ['admin','manager','developer','designer','agency']

export default function TeamPage() {
  const { user, profile } = useAuthStore()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at')
      if (error) throw error
      return data
    },
    enabled: profile?.role === 'admin',
    staleTime: 30_000,
  })

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data } = await supabase.from('team_invitations').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      return data || []
    },
    enabled: profile?.role === 'admin',
    staleTime: 30_000,
  })

  const toggleActive = async (member) => {
    await supabase.from('profiles').update({ is_active: !member.is_active }).eq('id', member.id)
    refetch()
    toast.success(member.is_active ? 'Member deactivated' : 'Member activated')
  }

  const changeRole = async (member, role) => {
    await supabase.from('profiles').update({ role }).eq('id', member.id)
    refetch()
    toast.success('Role updated')
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Team Members</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{members.length} members · {invitations.length} pending invites</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="btn-primary">
          <Plus size={16} /> Invite Member
        </button>
      </div>

      {/* Pending invites */}
      {invitations.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl glass-amber">
                <Mail size={15} style={{ color: 'var(--amber)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inv.name || inv.email}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.email} · {inv.role} · expires {formatDate(inv.expires_at)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="No team members" description="Invite your first team member" action={<button onClick={() => setInviteOpen(true)} className="btn-primary">Invite Member</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className={`glass rounded-2xl p-5 ${!m.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: m.id === user?.id ? 'var(--orange)' : 'linear-gradient(135deg, #6366F1, #0EA5E9)' }}>
                    {getInitials(m.name)}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {m.name}
                      {m.id === user?.id && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>You</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                  </div>
                </div>
                {m.id !== user?.id && (
                  <button
                    onClick={() => toggleActive(m)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
                    title={m.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {m.is_active ? <UserX size={13} style={{ color: 'var(--crimson)' }} /> : <UserCheck size={13} style={{ color: 'var(--emerald)' }} />}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                {m.id !== user?.id ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg font-semibold border-0 outline-none"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                ) : (
                  <StatusBadge status={m.role} />
                )}
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {m.last_login ? `Last: ${timeAgo(m.last_login)}` : 'Never logged in'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {inviteOpen && <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={refetch} />}
    </div>
  )
}

function InviteModal({ open, onClose, onInvited }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'developer' })
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      const { data: inv, error } = await supabase.from('team_invitations').insert({ ...form, status: 'pending' }).select().single()
      if (error) throw error
      await api.post('/api/team/send-invite', { invitationId: inv.id })
      toast.success(`Invite sent to ${form.email}!`)
      onInvited()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-glass" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required type="email" className="input-glass" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-glass">
            {ROLES.filter((r) => r !== 'admin').map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={sending} className="btn-primary flex-1 justify-center">
            <Mail size={15} /> {sending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
