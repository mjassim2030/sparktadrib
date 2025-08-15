import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router'
import { UserProvider } from './contexts/UserContext.jsx'
import "./i18n"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <UserProvider>
      <App />
    </UserProvider>
    </BrowserRouter>
  </StrictMode>,
)
