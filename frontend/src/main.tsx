import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'

// Standard iframe blocker (emergency killer disabled in dev)
import './utils/iframe-blocker'

// Disable emergency mode during development to prevent errors
const EMERGENCY_MODE = import.meta.env.VITE_EMERGENCY_MODE === 'true' && import.meta.env.PROD;

if (EMERGENCY_MODE) {
  console.warn('🛑 Emergency iframe killer mode active');

  // Import emergency iframe killer only in production
  import('./utils/emergency-iframe-killer').catch(error => {
    console.warn('Could not load emergency iframe killer:', error);
  });
}

// Load iframe tests in development mode
if (import.meta.env.DEV) {
  // Delay loading to prevent conflicts with iframe blocker
  setTimeout(() => {
    import('./utils/iframe-test').catch(error => {
      // Silent failure in development
      if (import.meta.env.DEV) {
        console.info('Iframe tests not loaded:', error.message);
      }
    });
  }, 2000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)