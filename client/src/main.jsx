import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply saved theme on load
const stored = localStorage.getItem('settings-storage')
if (stored) {
  try {
    const { state } = JSON.parse(stored)
    const theme = state?.theme || 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.body.className = theme
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.body.className = 'dark'
  }
} else {
  document.documentElement.setAttribute('data-theme', 'dark')
  document.body.className = 'dark'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
