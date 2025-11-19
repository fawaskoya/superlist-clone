import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 mb-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline">
              Try again
            </Button>
            <Button onClick={this.handleReload}>Reload Page</Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 w-full max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left font-mono text-sm">
              <p className="font-bold text-destructive mb-2">{this.state.error.message}</p>
              <pre>{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

