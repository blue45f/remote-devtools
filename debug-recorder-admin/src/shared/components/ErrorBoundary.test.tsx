import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Characterization smoke test: render-only. ErrorBoundary is a class component;
 * its default fallback was split into a function child so it can read i18n copy.
 * We force the fallback by throwing from a child and assert the i18n-driven
 * error title and retry button (pinned to English in test setup).
 */
describe('ErrorBoundary', () => {
  function Boom(): never {
    throw new Error('boom');
  }

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>healthy child</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('renders the i18n error fallback when a child throws', () => {
    // React logs the caught error to console.error; silence it for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    // The thrown error's message surfaces as the subtitle.
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    spy.mockRestore();
  });

  it('renders a custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('An error occurred')).not.toBeInTheDocument();

    spy.mockRestore();
  });
});
