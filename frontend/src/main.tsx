import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// getElementById returns HTMLElement | null — the ! asserts it exists.
// If #root is ever missing we want a loud crash, not a silent undefined.
const rootElement = document.getElementById('root')!

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
