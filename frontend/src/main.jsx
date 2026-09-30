import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import lightModeLogo from './assets/yamini-flex-logo-transparent.webp'
import darkModeLogo from './assets/yamini-flex-logo.webp'
import './index.css'
import './styles/premium-design-system.css'
import './styles/premium-polish.css'
import './styles/yamini-luxury-theme.css'
import App from './App.jsx'

const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('yamini-theme') : null
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}
const favicon = document.querySelector('link[rel="icon"]')
if (favicon) {
  favicon.href = savedTheme === 'dark' ? darkModeLogo : lightModeLogo
  favicon.type = 'image/webp'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
