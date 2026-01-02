import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { pushNotificationService } from './services/pushNotificationService'

// Registrar Service Worker automaticamente
if (pushNotificationService.isSupported()) {
  pushNotificationService.registerServiceWorker().catch(err => console.debug('[SW] Registro auto:', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
