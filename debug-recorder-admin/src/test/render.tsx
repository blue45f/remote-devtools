import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Shared test render helper for the admin smoke tests.
 *
 * Wraps the unit under test in the same providers the real app mounts
 * (router + react-query), but with retries and network-error logging disabled
 * so render-only characterization tests stay quiet and deterministic without a
 * backend. i18n is initialised globally in `test/setup.ts`.
 */

interface ProvidersOptions {
  /** Initial router entries, e.g. ['/dashboard']. */
  initialEntries?: string[];
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    // Swallow background query errors (no backend in jsdom) so they do not
    // surface as unhandled rejections during render-only smoke tests.
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  } as ConstructorParameters<typeof QueryClient>[0]);
}

function Providers({
  children,
  initialEntries = ['/'],
}: ProvidersOptions & { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProvidersOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { initialEntries, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => <Providers initialEntries={initialEntries}>{children}</Providers>,
    ...renderOptions,
  });
}
