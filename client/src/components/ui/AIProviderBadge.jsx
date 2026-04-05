import { Zap } from 'lucide-react'

const PROVIDER_CONFIG = {
  claude: { color: '#FF6B35', label: 'Claude' },
  openai: { color: '#10B981', label: 'OpenAI' },
  gemini: { color: '#0EA5E9', label: 'Gemini' },
  openrouter: { color: '#8B5CF6', label: 'OpenRouter' },
}

export function AIProviderBadge({ provider = 'claude', model = 'claude-sonnet-4-6' }) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.claude
  const shortModel = model?.split('-').slice(-2).join(' ') || model

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: `${config.color}18`,
        border: `1px solid ${config.color}35`,
        color: config.color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-dot-pulse" style={{ background: config.color }} />
      <span>{config.label} · {shortModel}</span>
    </div>
  )
}
