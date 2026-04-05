import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

export default function StatCard({ title, value, trend, trendLabel, icon: Icon, color, sparkData, subtitle, onClick }) {
  const [displayValue, setDisplayValue] = useState(0)
  const targetRef = useRef(value)

  // Count-up animation
  useEffect(() => {
    targetRef.current = value
    const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.]/g, ''))
    if (isNaN(numVal)) { setDisplayValue(value); return }
    const duration = 1000
    const start = Date.now()
    const from = 0
    const step = () => {
      const now = Date.now()
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(from + (numVal - from) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])

  const isPositiveTrend = trend >= 0
  const TrendIcon = isPositiveTrend ? ArrowUpRight : ArrowDownRight
  const trendColor = isPositiveTrend ? 'var(--emerald)' : 'var(--crimson)'

  const defaultSparkData = sparkData || Array.from({ length: 7 }, (_, i) => ({ v: Math.random() * 100 }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: `0 12px 40px ${color}30, 0 4px 16px rgba(0,0,0,0.1)` }}
      transition={{ duration: 0.22 }}
      className="glass glass-card rounded-2xl p-5 cursor-pointer relative overflow-hidden"
      style={{ border: `1px solid ${color}25` }}
      onClick={onClick}
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
          <p className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {typeof value === 'number' ? displayValue.toLocaleString('en-IN') : value}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg" style={{ background: `${trendColor}18` }}>
          <TrendIcon size={12} style={{ color: trendColor }} />
          <span className="text-xs font-bold" style={{ color: trendColor }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{trendLabel || subtitle || 'this month'}</span>
      </div>

      {/* Sparkline */}
      <div className="h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={defaultSparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id={`grad-${color?.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${color?.replace('#', '')})`}
              dot={false}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
