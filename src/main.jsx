import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import AuthGate from './AuthGate.jsx'
import { AuthProvider } from './auth/AuthContext'
import { applyTheme, getInitialTheme } from './lib/themeMode'

applyTheme(getInitialTheme())

// Atualiza o app sozinho quando uma versão nova é publicada (sem precisar
// desinstalar/reinstalar) — só entra em vigor de fato quando o Vite gera
// a build de produção; em `npm run dev` isso não faz nada.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </StrictMode>,
)
