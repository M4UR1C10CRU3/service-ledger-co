import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode }
interface State { hasError: boolean; isChunkError: boolean; errorMsg: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || String(error);
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk');
    return { hasError: true, isChunkError, errorMsg: msg };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkError) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-6">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-1">Nova versão disponível</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              A aplicação foi actualizada. Por favor recarregue a página para continuar.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-6">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-2xl">⚠</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1">Erro inesperado</h2>
          {this.state.errorMsg && (
            <p className="text-xs font-mono bg-muted rounded px-2 py-1 mt-1 max-w-sm break-all">
              {this.state.errorMsg}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => this.setState({ hasError: false, isChunkError: false, errorMsg: '' })}>
          Tentar novamente
        </Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recarregar página
        </Button>
      </div>
    );
  }
}
