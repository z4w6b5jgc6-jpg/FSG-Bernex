import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configProblems } from './api'
import { ConfigError } from './components/ConfigError'
import { initTheme } from './lib/theme'
import { applyPrefs } from './lib/prefs'

initTheme()
applyPrefs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {configProblems ? <ConfigError problems={configProblems} /> : <App />}
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
