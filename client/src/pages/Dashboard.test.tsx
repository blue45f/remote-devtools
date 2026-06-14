import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import Dashboard from './Dashboard';

import { renderWithProviders } from '@/test/utils';

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

    const weekly = screen.getByRole('button', { name: /Weekly/ });
    expect(weekly).toHaveAttribute('aria-pressed', 'false');

    await user.click(weekly);
    expect(weekly).toHaveAttribute('aria-pressed', 'true');
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

    await user.click(screen.getByRole('button', { name: /Weekly/ }));
    await waitFor(() => {
      expect(localStorage.getItem('dashboard-prefs:v1')).toContain('"period":"week"');
    });
  });

  it('hydrates the period from localStorage on mount', async () => {
    localStorage.setItem('dashboard-prefs:v1', JSON.stringify({ period: 'month' }));
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Monthly/, pressed: true })).toBeInTheDocument();
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

  it('renders the Top tags panel with chips from seed data', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-top-tags')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('dashboard-top-tag-chip').length).toBeGreaterThan(0);
    });
  });

  it('renders the Recently annotated panel from seed data', async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-recent-notes')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('dashboard-recent-note-row').length).toBeGreaterThan(0);
    });
  });
});
