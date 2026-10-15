import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import App from './App.tsx'

if (import.meta.env.DEV) {
    import('./lib/vault').then((v) => { (window as any).vault = v })
    import('./lib/syncDoc').then((s) => { (window as any).sync = s })
    import('yjs').then((Y) => { (window as any).Y = Y })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
