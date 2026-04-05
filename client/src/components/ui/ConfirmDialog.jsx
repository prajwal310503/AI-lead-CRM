import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react'

export default function ConfirmDialog({
  open, onConfirm, onCancel,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
}) {
  const color = danger ? '#EF4444' : '#FF6B35'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 99999 }}
          onClick={e => { if (e.target === e.currentTarget) onCancel() }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: -16 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{    scale: 0.85, opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{
              width: '100%', maxWidth: 400,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: '1.6rem',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {/* Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {danger
                  ? <Trash2 size={20} style={{ color }} />
                  : <HelpCircle size={20} style={{ color }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {title}
                </h3>
                {message && (
                  <p style={{ margin: '5px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '1rem 0' }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onCancel}
                disabled={loading}
                style={{
                  flex: 1, padding: '0.55rem', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                  flex: 1, padding: '0.55rem', borderRadius: 10,
                  border: 'none', background: color,
                  color: '#fff', fontSize: '0.88rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {loading ? 'Deleting…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
