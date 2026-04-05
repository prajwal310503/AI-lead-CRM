import { statusColor } from '../../utils/format'

const LABELS = {
  cold: 'Cold', contacted: 'Contacted', warm: 'Warm', hot: 'Hot',
  proposal_sent: 'Proposal Sent', negotiation: 'Negotiation', converted: 'Converted', lost: 'Lost',
  active: 'Active', inactive: 'Inactive', pending: 'Pending',
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', accepted: 'Accepted',
  rejected: 'Rejected', revised: 'Revised', expired: 'Expired',
  paid: 'Paid', overdue: 'Overdue', partial: 'Partial', cancelled: 'Cancelled',
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', blocked: 'Blocked',
  planning: 'Planning', on_hold: 'On Hold', completed: 'Completed',
  admin: 'Admin', manager: 'Manager', developer: 'Developer', designer: 'Designer',
  agency: 'Agency', client: 'Client',
}

const PRIORITY_COLORS = { urgent: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981' }

export function StatusBadge({ status, size = 'sm' }) {
  const color = statusColor(status)
  const label = LABELS[status] || status
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 ${pad} rounded-full font-semibold`}
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || '#8892AA'
  const label = priority?.charAt(0).toUpperCase() + priority?.slice(1) || priority

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold"
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  )
}
