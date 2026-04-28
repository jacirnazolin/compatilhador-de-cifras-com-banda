/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/50">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black tracking-tighter uppercase">Ops! Algo deu errado</h1>
            <p className="text-gray-500 text-sm max-w-xs">{this.state.error?.message || 'Ocorreu um erro inesperado no aplicativo.'}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
