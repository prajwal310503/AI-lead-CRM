import { useState, useEffect } from 'react'
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CheckSquare, Plus, Filter } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/useAuthStore'
import TaskCard from './components/TaskCard'
import TaskModal from './components/TaskModal'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#64748B' },
  { id: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { id: 'review', label: 'Review', color: '#8B5CF6' },
  { id: 'done', label: 'Done', color: '#10B981' },
]

export default function TasksPage() {
  const { user, profile } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const { data: tasksData, refetch } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*').order('sort_order').order('created_at', { ascending: false })
      if (!['admin', 'manager'].includes(profile?.role)) q = q.eq('assigned_to', user.id)
      const { data, error } = await q
      if (error) throw error
      return data
    },
    enabled: !!user && !!profile,
    staleTime: 30_000,
  })

  useEffect(() => { if (tasksData) setTasks(tasksData) }, [tasksData])

  useEffect(() => {
    supabase.from('profiles').select('id, name, role').order('name').then(({ data }) => setMembers(data || []))
  }, [])

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const newStatus = COLUMNS.find((c) => c.id === over.id)?.id
    if (!newStatus) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return
    setTasks((prev) => prev.map((t) => t.id === active.id ? { ...t, status: newStatus } : t))
    const updates = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'done') updates.completed_at = new Date().toISOString()
    const { error } = await supabase.from('tasks').update(updates).eq('id', active.id)
    if (error) toast.error('Failed to update task')
    else refetch()
  }

  const handleSaved = (task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id)
      if (idx >= 0) { const updated = [...prev]; updated[idx] = task; return updated }
      return [task, ...prev]
    })
  }

  const getColTasks = (status) => tasks.filter((t) => t.status === status)
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length,
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--indigo-light)' }}>
            <CheckSquare size={18} style={{ color: 'var(--indigo)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.done}/{stats.total} done · {stats.overdue} overdue</p>
          </div>
        </div>
        <button onClick={() => { setEditTask(null); setModalOpen(true) }} className="btn-primary text-sm">
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex h-full gap-3 px-4 py-4 overflow-x-auto">
            {COLUMNS.map((col) => {
              const colTasks = getColTasks(col.id)
              return (
                <TaskDropZone key={col.id} col={col} tasks={colTasks} members={members}
                  onAdd={() => { setEditTask(null); setModalOpen(true) }}
                  onEdit={(t) => { setEditTask(t); setModalOpen(true) }} />
              )
            })}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} members={members} />}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null) }}
        task={editTask}
        onSaved={handleSaved}
      />
    </div>
  )
}

function TaskDropZone({ col, tasks, members, onAdd, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-shrink-0 rounded-2xl transition-all"
      style={{
        width: 280, minWidth: 280,
        background: isOver ? `${col.color}12` : 'var(--bg-glass)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${isOver ? col.color + '40' : 'var(--border-white)'}`,
        boxShadow: isOver ? `0 0 0 2px ${col.color}30` : 'var(--shadow-glass)',
        maxHeight: 'calc(100vh - 150px)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
        style={{ background: `${col.color}15`, borderBottom: `1px solid ${col.color}20` }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
          <h3 className="text-sm font-bold" style={{ color: col.color }}>{col.label}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${col.color}20`, color: col.color }}>{tasks.length}</span>
        </div>
        <button onClick={onAdd} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: `${col.color}20`, color: col.color }}>
          <Plus size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} members={members} onClick={onEdit} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed" style={{ borderColor: `${col.color}30` }}>
            <p className="text-xs" style={{ color: `${col.color}60` }}>Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}
