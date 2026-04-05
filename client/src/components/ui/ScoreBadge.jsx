import { scoreColor, scoreLabel } from '../../utils/format'

export default function ScoreBadge({ score, size = 48 }) {
  if (!score && score !== 0) return null
  const color = scoreColor(score)
  const radius = (size - 6) / 2
  const circ = 2 * Math.PI * radius
  const fill = (score / 100) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={3} />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color, fontSize: size < 40 ? 9 : 11 }}>{score}</span>
      </div>
    </div>
  )
}
