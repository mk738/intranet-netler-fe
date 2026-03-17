import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
          <div className="card max-w-sm w-full text-center">
            <p className="text-sm font-semibold text-text-1 mb-1">Something went wrong</p>
            <p className="text-xs text-text-3 mb-5 font-mono">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
