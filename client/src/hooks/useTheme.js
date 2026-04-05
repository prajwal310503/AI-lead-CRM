import { useEffect } from 'react'
import useSettingsStore from '../stores/useSettingsStore'

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useSettingsStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.className = theme
  }, [theme])

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
