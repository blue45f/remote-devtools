import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCards } from './StatsCards';

/**
 * Characterization smoke test: render-only. StatsCards is presentational; it
 * branches on viewMode to pick which i18n-driven stat titles to show.
 */
describe('StatsCards', () => {
  it('renders ticket stat titles for the ticket view', () => {
    render(<StatsCards stats={null} viewMode="ticket" isLoading={false} />);

    expect(screen.getByText('Total Tickets')).toBeInTheDocument();
    expect(screen.getByText('Tickets Created Today')).toBeInTheDocument();
    expect(screen.getByText('Resolution Rate')).toBeInTheDocument();
  });

  it('renders recording-room stat titles for the recordRoom view', () => {
    render(<StatsCards stats={null} viewMode="recordRoom" isLoading={false} />);

    expect(screen.getByText('Total Recording Rooms')).toBeInTheDocument();
    expect(screen.getByText('Active Recording Rooms')).toBeInTheDocument();
  });
});
