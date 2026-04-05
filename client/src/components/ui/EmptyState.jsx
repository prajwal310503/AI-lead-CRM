export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <Icon size={28} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
        </div>
      )}
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      {action && action}
    </div>
  )
}
