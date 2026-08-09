'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('页面渲染异常:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-lg font-serif text-[#4B3B2F] mb-2">页面遇到了一点问题</p>
          <p className="text-sm text-[#8B7355] mb-6 leading-relaxed">
            可能是网络或内存波动，刷新后通常就能恢复。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-[#D98A45] text-white text-sm font-medium"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
