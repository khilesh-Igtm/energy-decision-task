import React from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

/**
 * Top-level application component with global error boundary fallback.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error inside React Dashboard:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-error-container">
          <div className="fatal-error-card">
            <h2>Something went wrong</h2>
            <p>An unexpected rendering error occurred in the dashboard.</p>
            <pre className="error-stack">{this.state.error?.toString()}</pre>
            <button
              type="button"
              className="btn-retry"
              onClick={() => window.location.reload()}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="app-root">
        <Dashboard />
      </div>
    </ErrorBoundary>
  );
}
