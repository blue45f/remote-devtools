import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { RemoteDevToolsPage } from './RemoteDevToolsPage';

/**
 * Characterization smoke test: render-only. With no VITE_REMOTE_DEVTOOLS_ENABLED
 * set in the test env, the feature is disabled, so the page short-circuits to the
 * "disabled" PageContainer + warning Alert before any session/event query fires.
 * That path is fully static and i18n-driven (pinned to English in test setup),
 * which is enough to characterize the page chrome without a backend or WebSocket.
 */
describe('RemoteDevToolsPage', () => {
  it('renders the disabled-feature notice when the integration is off', () => {
    renderWithProviders(<RemoteDevToolsPage />, {
      initialEntries: ['/remote-devtools'],
    });

    // PageContainer title (level-2 heading).
    expect(screen.getByRole('heading', { name: 'Remote DevTools', level: 2 })).toBeInTheDocument();

    // Disabled-state Alert message + description come from i18n.
    expect(screen.getByText('Remote DevTools integration disabled')).toBeInTheDocument();
    expect(screen.getByText(/VITE_REMOTE_DEVTOOLS_ENABLED is currently false/)).toBeInTheDocument();
  });
});
