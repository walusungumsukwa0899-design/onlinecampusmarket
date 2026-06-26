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
    console.error('Wolf Marketplace error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px', fontFamily: 'Inter, sans-serif', background: '#fafafa'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🐺</div>
        <h2 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '8px', color: '#111' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', maxWidth: '360px', marginBottom: '24px', lineHeight: 1.6 }}>
          Wolf Marketplace hit an unexpected error. Your cart and account data are safe.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
            style={{ background: '#E8630A', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >
            Back to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '12px 24px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
        {import.meta.env.DEV && this.state.error && (
          <pre style={{ marginTop: '24px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', fontSize: '11px', color: '#b91c1c', maxWidth: '600px', overflowX: 'auto', textAlign: 'left' }}>
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    )
  }
}
