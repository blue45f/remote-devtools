import * as Sentry from '@sentry/react';
import { AlertTriangle, Check, Copy, Home, RotateCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import i18n from '@/lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  copied: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, copied: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? undefined });
    // Forward to Sentry when configured — no-op otherwise. We swallow any
    // throw from the SDK so it can't take down the fallback UI itself.
    try {
      Sentry.captureException(error, {
        contexts: {
          react: { componentStack: info.componentStack ?? '' },
        },
      });
    } catch {
      /* SDK not initialised — fine */
    }
    // Always log to the dev console too so local debugging stays simple.
    console.error('[ErrorBoundary]', error, info);
  }

  copyDetails = async () => {
    const { error, componentStack } = this.state;
    const lines = [
      `Message: ${error?.message ?? '(no message)'}`,
      `URL: ${typeof window !== 'undefined' ? globalThis.location.href : ''}`,
      `User-Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
      `Time: ${new Date().toISOString()}`,
      '',
      'Stack:',
      error?.stack ?? '(no stack)',
      '',
      'Component stack:',
      componentStack ?? '(unavailable)',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.setState({ copied: true });
      globalThis.setTimeout(() => this.setState({ copied: false }), 1500);
    } catch {
      /* user denied clipboard or unsupported — ignore */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, copied } = this.state;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="flex flex-col items-center gap-5 max-w-lg text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger border border-border">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">
              {i18n.t('errors.title')}
            </h2>
            <p className="mt-1 text-sm text-fg-subtle">
              {error?.message ?? i18n.t('errors.description')}
            </p>
          </div>

          {error?.stack && (
            <details className="w-full text-left">
              <summary className="cursor-pointer text-xs text-fg-faint hover:text-fg-subtle inline-flex items-center gap-1">
                {i18n.t('errors.showDetails')}
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-bg-subtle p-3 font-mono text-[11px] text-fg-subtle whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={() => globalThis.location.reload()}>
              <RotateCw />
              {i18n.t('errors.reload')}
            </Button>
            <Button asChild variant="outline">
              <a href="/dashboard">
                <Home />
                {i18n.t('errors.goToDashboard')}
              </a>
            </Button>
            <Button variant="ghost" onClick={() => void this.copyDetails()}>
              {copied ? <Check /> : <Copy />}
              {copied ? i18n.t('common.copied') : i18n.t('errors.copyDetails')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
