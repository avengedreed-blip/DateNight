import React from "react";

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
        <div className="loading-screen loading-screen--error">
          <main className="loading-panel" role="alert" aria-live="assertive">
            <h1 className="loading-panel__title">Oops! Something went wrong.</h1>
            <p className="loading-panel__text">Please try refreshing the page.</p>
            <button
              type="button"
              className="primary-button mt-4"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </main>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;

