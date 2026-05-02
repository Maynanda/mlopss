import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          fontSize: '0.875rem',
        },
        success: { iconTheme: { primary: 'var(--emerald)', secondary: 'var(--bg-elevated)' } },
        error:   { iconTheme: { primary: 'var(--rose)', secondary: 'var(--bg-elevated)' } },
      }}
    />
  </React.StrictMode>,
)
