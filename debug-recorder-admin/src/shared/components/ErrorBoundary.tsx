import { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Button from 'antd/es/button';
import Result from 'antd/es/result';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Default error fallback. Split out as a function component because
 * ErrorBoundary itself is a class and cannot call the `useTranslation` hook.
 */
function DefaultErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  const { t } = useTranslation();

  return (
    <Result
      status="error"
      title={t('common.error.title')}
      subTitle={error?.message || t('common.error.unknown')}
      extra={
        <Button type="primary" onClick={onReset}>
          {t('common.error.retry')}
        </Button>
      }
    />
  );
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
