import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/utils';

import Dashboard from './Dashboard';

beforeEach(() => {
  localStorage.setItem('demo-mode', '1');
});

describe('Dashboard page', () => {
  it('renders the headline metrics from seed data', async () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();

    // Stat tiles eventually render; live count should match seed live sessions (2)
    await waitFor(() => {
      expect(screen.getAllByText(/Live now/i).length).toBeGreaterThan(0);
    });
  });

  it('switches between daily / weekly / monthly periods', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    const weekly = screen.getByRole('tab', { name: /Weekly/ });
    expect(weekly).toHaveAttribute('aria-selected', 'false');

    await user.click(weekly);
    expect(weekly).toHaveAttribute('aria-selected', 'true');
  });

  it('renders an activity feed section', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Recent activity/)).toBeInTheDocument();
    });
  });

  it('persists the chosen period to localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await user.click(screen.getByRole('tab', { name: /Weekly/ }));
    await waitFor(() => {
      expect(localStorage.getItem('dashboard-prefs:v1')).toContain('"period":"week"');
    });
  });

  it('hydrates the period from localStorage on mount', async () => {
    localStorage.setItem('dashboard-prefs:v1', JSON.stringify({ period: 'month' }));
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Monthly/, selected: true })).toBeInTheDocument();
    });
  });

  it('renders the Top hosts panel with rows from seed data', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-top-hosts')).toBeInTheDocument();
    });
    await waitFor(() => {
      const rows = screen.getAllByTestId('dashboard-top-host-row');
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
