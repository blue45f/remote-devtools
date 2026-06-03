import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { DashboardPage } from './DashboardPage';

/**
 * Characterization smoke test: render-only. Dashboard queries fire on mount but
 * have no backend in jsdom; with retries disabled (see test/render) they stay in
 * the loading state, which is enough to assert the page chrome renders. We only
 * verify static, i18n-driven headings/controls — no interaction.
 */
describe('DashboardPage', () => {
  it('renders the page heading and refresh control', () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] });

    // PageContainer title (level-2 heading) and the refresh button.
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
  });

  it('renders the period and view-mode selectors', () => {
    renderWithProviders(<DashboardPage />, { initialEntries: ['/dashboard'] });

    // View-mode radios (default viewMode = ticket).
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Recording Rooms')).toBeInTheDocument();
    // Period radios.
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });
});
