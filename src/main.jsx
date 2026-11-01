import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './config/queryClient'
import './index.css'
import App from './App.jsx'

// Automatically unregister any active dev service workers to allow browser (disk cache)
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('[Cache] Unregistered dev Service Worker to enable browser (disk cache)')
        }
      })
    }
  })
}

// Console banner for DevTools inspection (Ctrl + Shift + I)
console.log(
  '%c[Query Cache]%c TanStack React Query activated · StaleTime: 5m · Browser disk cache enabled',
  'color: #10b981; font-weight: bold; background: #064e3b; padding: 2px 6px; border-radius: 4px;',
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
