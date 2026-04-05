import { Calendar, Clock, MessageSquare, GripVertical } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '../../../components/ui/StatusBadge'
import { formatDate } from '../../../utils/format'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskCard({ task, onClick, members = [] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 999 : 1 }
  const assignee = members.find((m) => m.id === task.assigned_to)
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="glass rounded-xl p-3.5 cursor-pointer group hover:shadow-lg transition-all"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start gap-2">
        <div {...listeners} className="mt-0.5 opacity-0 group-hover:opacity-40 cursor-grab flex-shrink-0">
          <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <PriorityBadge priority={task.priority} />
            {task.tags?.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                {task.tags[0]}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {task.deadline && (
              <span className="flex items-center gap-1" style={{ color: isOverdue ? 'var(--crimson)' : 'var(--text-muted)' }}>
                <Calendar size={11} /> {formatDate(task.deadline)}
              </span>
            )}
            {task.estimated_hours && (
              <span className="flex items-center gap-1"><Clock size={11} /> {task.estimated_hours}h</span>
            )}
          </div>
          {assignee && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #0EA5E9)' }}>
                {assignee.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{assignee.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
