import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'មានបញ្ហាបច្ចេកទេសកើតឡើង',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-lg p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#111113]">
              សូមអភ័យទោស មានបញ្ហាបច្ចេកទេសបន្តិចបន្តួច
            </h2>
            <p className="text-xs text-stone-500 break-words">
              សូមផ្ទុកទំព័រឡើងវិញម្ដងទៀត ដើម្បីបន្តការទិញទំនិញ។
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111113] text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ផ្ទុកទំព័រឡើងវិញ (Reload)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
