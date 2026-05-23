import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/material-symbols-outlined/full.css'
import './index.css'
import App from './App.jsx'
import { scheduleTokenRefresh } from './api/tokenAuth'

// 刷新页面后，若本地仍有 token 则继续定时续期
if (localStorage.getItem('token') && localStorage.getItem('refresh_token')) {
  scheduleTokenRefresh()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
