import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          backgroundColor: 'var(--bg-main)', 
          color: 'var(--text-main)',
          fontFamily: 'Poppins, sans-serif',
          padding: '1rem'
        }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--primary-accent)' }}>Oops! Something went wrong.</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary-accent)',
              border: 'none',
              borderRadius: '0.75rem',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;

