import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './config/queryClient'
import './index.css'
import App from './App.jsx'

// Ensure service worker is completely unregistered so browser uses native (disk cache)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('[Disk Cache] Unregistered Service Worker to enforce native browser (disk cache)')
        }
      })
    }
  })
}

// Console banner for DevTools inspection (Ctrl + Shift + I)
console.log(
  '%c[Query Cache & Disk Cache]%c TanStack React Query active · HTTP Disk Cache enabled (Cache-Control: max-age=31536000)',
  'color: #10b981; font-weight: bold; background: #064e3b; padding: 3px 8px; border-radius: 4px;',
  'color: inherit;'
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
