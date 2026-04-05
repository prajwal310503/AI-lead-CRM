export default function GlassCard({ children, className = '', variant = 'default', hover = true, onClick, style }) {
  const variants = {
    default: 'glass',
    orange: 'glass-orange',
    blue: 'glass-blue',
    indigo: 'glass-indigo',
    purple: 'glass-purple',
    emerald: 'glass-emerald',
    amber: 'glass-amber',
    crimson: 'glass-crimson',
  }

  return (
    <div
      className={`${variants[variant]} rounded-2xl ${hover ? 'glass-card' : ''} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
