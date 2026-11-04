import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')

function StartupMessage({ title, message, details }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ width: '100%', maxWidth: 720, padding: 28, background: '#fff', border: '1px solid #fecaca', borderRadius: 12, boxShadow: '0 8px 30px rgba(15,23,42,.06)' }}>
        <h1 style={{ margin: '0 0 12px', color: '#991b1b', fontSize: 22 }}>{title}</h1>
        <p style={{ margin: '0 0 16px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message}</p>
        {details && <pre style={{ overflowX: 'auto', padding: 16, background: '#f1f5f9', borderRadius: 8, color: '#334155', fontSize: 12, whiteSpace: 'pre-wrap' }}>{details}</pre>}
        <p style={{ margin: '16px 0 0', color: '#64748b', fontSize: 13 }}>This diagnostic screen is shown so the application does not fail silently.</p>
      </section>
    </main>
  )
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('2WAYZ React render error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return <StartupMessage title="2WAYZ could not render this page" message={this.state.error.message || String(this.state.error)} details={this.state.error.stack} />
    }
    return this.props.children
  }
}

if (!rootElement) {
  document.body.innerHTML = '<main style="padding:24px;font:16px Arial;color:#991b1b">2WAYZ startup error: the #root element is missing from index.html.</main>'
} else {
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  )
}
