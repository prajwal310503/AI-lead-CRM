import { useState, useEffect, useRef } from 'react'
import Modal from '../../../components/ui/Modal'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../stores/useAuthStore'
import { timeAgo, getInitials } from '../../../utils/format'
import { Send, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const PRIORITIES = ['low','medium','high','urgent']
const STATUSES = ['todo','in_progress','review','done']

export default function TaskModal({ open, onClose, task, projectId, onSaved }) {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('details')
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', deadline: '', estimated_hours: '', tags: '', assigned_to: '' })
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const commentsEndRef = useRef(null)

  useEffect(() => {
    if (open) {
      fetchMembers()
      if (task) {
        setForm({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'medium',
          status: task.status || 'todo',
          deadline: task.deadline || '',
          estimated_hours: task.estimated_hours || '',
          tags: (task.tags || []).join(', '),
          assigned_to: task.assigned_to || '',
        })
        loadComments(task.id)
      } else {
        setForm({ title: '', description: '', priority: 'medium', status: 'todo', deadline: '', estimated_hours: '', tags: '', assigned_to: '' })
        setComments([])
      }
      setActiveTab('details')
    }
  }, [open, task])

  useEffect(() => {
    if (activeTab === 'comments') commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTab, comments])

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('id, name, role').eq('is_active', true)
    setMembers(data || [])
  }

  const loadComments = async (taskId) => {
    const { data } = await supabase
      .from('task_comments')
      .select('*, profiles(name)')
      .eq('task_id', taskId)
      .order('created_at')
    setComments(data || [])
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title) { toast.error('Title required'); return }
    setSaving(true)
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      deadline: form.deadline || null,
      assigned_to: form.assigned_to || null,
      project_id: projectId || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = task
      ? await supabase.from('tasks').update(payload).eq('id', task.id).select().single()
      : await supabase.from('tasks').insert(payload).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(task ? 'Task updated!' : 'Task created!')
    onSaved?.(data)
    onClose()
    setSaving(false)
  }

  const postComment = async () => {
    if (!commentText.trim() || !task?.id) return
    setPostingComment(true)
    const { error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: user.id,
      comment: commentText.trim(),
    })
    if (error) { toast.error(error.message) } else {
      setCommentText('')
      await loadComments(task.id)
    }
    setPostingComment(false)
  }

  const PRIORITY_COLOR = { urgent: 'var(--crimson)', high: 'var(--orange)', medium: 'var(--amber)', low: 'var(--emerald)' }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit Task' : 'New Task'} size="lg" noPadding>
      {/* Tabs */}
      <div className="flex border-b px-5 pt-4" style={{ borderColor: 'var(--border)' }}>
        {['details', ...(task ? ['comments'] : [])].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all capitalize"
            style={{
              borderColor: activeTab === t ? 'var(--orange)' : 'transparent',
              color: activeTab === t ? 'var(--orange)' : 'var(--text-muted)',
            }}
          >
            {t === 'comments' && <MessageSquare size={13} />}
            {t}
            {t === 'comments' && comments.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>{comments.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Title *</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} required className="input-glass" placeholder="Task title" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="input-glass resize-none" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Priority</label>
                <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="input-glass" style={{ borderLeft: `3px solid ${PRIORITY_COLOR[form.priority]}` }}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input-glass">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className="input-glass" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Est. Hours</label>
                <input type="number" value={form.estimated_hours} onChange={(e) => set('estimated_hours', e.target.value)} className="input-glass" step={0.5} min={0} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Assign To</label>
                <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} className="input-glass">
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className="input-glass" placeholder="design, frontend" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}</button>
            </div>
          </form>
        )}

        {activeTab === 'comments' && task && (
          <div className="flex flex-col" style={{ maxHeight: '60vh' }}>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4" style={{ minHeight: 200 }}>
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No comments yet. Start the conversation.</p>
                </div>
              ) : comments.map((c) => (
                <div key={c.id} className={`flex gap-2.5 ${c.user_id === user.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'var(--orange)' }}>
                    {getInitials(c.profiles?.name || 'U')}
                  </div>
                  <div className={`max-w-[75%] ${c.user_id === user.id ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="px-3 py-2 rounded-xl text-sm" style={{
                      background: c.user_id === user.id ? 'var(--orange)' : 'var(--bg-secondary)',
                      color: c.user_id === user.id ? 'white' : 'var(--text-primary)',
                      borderRadius: c.user_id === user.id ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    }}>
                      {c.comment}
                    </div>
                    <span className="text-[10px] mt-0.5 px-1" style={{ color: 'var(--text-muted)' }}>
                      {c.profiles?.name} · {timeAgo(c.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
            {/* Input */}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
                placeholder="Add a comment... (Enter to send)"
                className="input-glass flex-1"
              />
              <button onClick={postComment} disabled={postingComment || !commentText.trim()} className="btn-primary px-3">
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
