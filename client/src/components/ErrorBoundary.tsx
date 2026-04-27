import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger border border-border">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-fg-subtle">
              {this.state.error?.message ??
                "The interface hit an unexpected error and could not continue."}
            </p>
          </div>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
