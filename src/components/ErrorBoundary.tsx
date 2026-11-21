import React from 'react';

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
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed && parsed.error) {
        readable = `Access or connection error (${parsed.operationType || 'read'}): ${parsed.error}`;
      }
    } catch {
      // Standard Error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FCF9F6] text-[#1F1B1C] flex items-center justify-center px-6 py-16">
          <div className="max-w-lg w-full bg-white border border-[#E8E0DF] rounded-xl p-8 text-center">
            <p className="text-xs tracking-widest uppercase text-[#8E3F4F] font-medium mb-3">
              HerMoney Studio
            </p>
            <h1 className="font-serif text-2xl font-semibold text-[#1F1B1C] mb-3">
              Something interrupted this view
            </h1>
            <p className="text-sm text-[#5C5355] leading-relaxed mb-6 break-words">
              {this.state.message}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#8E3F4F] text-white hover:bg-[#75313F] transition-colors cursor-pointer"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-[#E8E0DF] text-[#1F1B1C] hover:bg-[#F7EAEB] transition-colors"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
