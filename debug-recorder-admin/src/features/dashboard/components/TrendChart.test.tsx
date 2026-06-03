import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendChart } from './TrendChart';

/**
 * Characterization smoke test: render-only. TrendChart is a pure presentational
 * component (no router/query providers needed). We exercise the empty-state and
 * title branches via i18n copy (pinned to English in test setup).
 */
describe('TrendChart', () => {
  it('shows the empty state when there is no data and it is not loading', () => {
    render(<TrendChart viewMode="ticket" ticketData={[]} recordRoomData={[]} isLoading={false} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    // Card title for the ticket view.
    expect(screen.getByText('Ticket Trend')).toBeInTheDocument();
  });

  it('uses the recording-room title for the recordRoom view', () => {
    render(
      <TrendChart viewMode="recordRoom" ticketData={[]} recordRoomData={[]} isLoading={false} />,
    );

    expect(screen.getByText('Recording Room Trend')).toBeInTheDocument();
  });

  it('does not show the empty state while loading', () => {
    render(<TrendChart viewMode="ticket" ticketData={[]} recordRoomData={[]} isLoading />);

    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
  });
});
