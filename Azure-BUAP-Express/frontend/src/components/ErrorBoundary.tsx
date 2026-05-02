import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 rounded-card border border-danger/30 bg-danger-light m-6">
            <p className="text-sm font-medium text-danger-dark">
              Ocurrió un error en esta sección. Intenta recargar la página.
            </p>
            <p className="text-xs text-danger mt-1 font-mono">
              {this.state.error?.message}
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
