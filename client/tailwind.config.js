/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        orange: {
          DEFAULT: '#FF6B35',
          dark: '#E85D2A',
          light: '#FFF0EA',
        },
        blue: {
          DEFAULT: '#0EA5E9',
          dark: '#0284C7',
          light: '#DBEAFE',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.4,0,0.2,1) both',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1) both',
        'pulse-ring': 'pulseRing 2s ease-in-out infinite',
        'dot-pulse': 'dotPulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
