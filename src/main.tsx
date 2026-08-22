import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Font faces are declared in index.css against the bundled Latin files —
// see the @font-face block there.
import '@/index.css'
import App from '@/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  </StrictMode>,
)
