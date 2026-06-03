import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/render';
import { Layout } from './Layout';

/**
 * Characterization smoke test: render-only. Auth is disabled by default
 * (no VITE_ADMIN_BFF_HOST), so `useSession` resolves synchronously to
 * authenticated=true and never hits the network.
 */
describe('Layout', () => {
  function renderLayout() {
    return renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>child route content</div>} />
        </Route>
      </Routes>,
      { initialEntries: ['/'] },
    );
  }

  it('renders the app shell with the nav menu', () => {
    renderLayout();

    // Sidebar nav labels come from i18n (pinned to English in test setup).
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Info')).toBeInTheDocument();
  });

  it('renders the outlet child route', () => {
    renderLayout();

    expect(screen.getByText('child route content')).toBeInTheDocument();
  });
});
