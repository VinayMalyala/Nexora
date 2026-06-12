import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled app error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Please refresh the page. If the issue continues, check your connection and environment setup.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
