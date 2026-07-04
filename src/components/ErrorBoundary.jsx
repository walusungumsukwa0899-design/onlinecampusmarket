import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Wolf Business Platform error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🐺</div>
          <h2 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Wolf Business Platform ran into an unexpected error. Your cart and data are safe.
          </p>
          {this.state.error && (
            <details style={{ background: '#f1f5f9', borderRadius: '8px', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Error details</summary>
              <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{this.state.error.message}</pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => this.setState({ hasError: false, error: null })}
              style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              Try Again
            </button>
            <button onClick={() => { window.location.href = '/home' }}
              style={{ background: '#E8630A', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
