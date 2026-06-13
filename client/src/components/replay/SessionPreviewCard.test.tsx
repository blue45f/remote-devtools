import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { SessionPreviewCard } from './SessionPreviewCard';

import { renderWithProviders } from '@/test/utils';

beforeEach(() => {
  localStorage.setItem('demo-mode', '1');
});

describe('SessionPreviewCard', () => {
  it('renders the heatmap canvas with native-pixel dimensions when click points are present', async () => {
    renderWithProviders(
      <SessionPreviewCard
        sessionId={1000}
        clickPoints={[
          { x: 100, y: 200 },
          { x: 350, y: 240 },
          { x: 110, y: 210 },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('preview-heatmap')).toBeInTheDocument();
    });
    const canvas = screen.getByTestId('preview-heatmap') as HTMLCanvasElement;
    // The default native canvas matches the seed preview dimensions.
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(800);
  });

  it('hides the heatmap when the toggle is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SessionPreviewCard sessionId={1000} clickPoints={[{ x: 100, y: 200 }]} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-heatmap')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('preview-heatmap-toggle'));
    await waitFor(() => {
      expect(screen.queryByTestId('preview-heatmap')).not.toBeInTheDocument();
    });
  });

  it("doesn't render the heatmap when no click points are supplied", async () => {
    renderWithProviders(<SessionPreviewCard sessionId={1000} />);
    // Wait for the iframe to settle, then assert the canvas never appears.
    await waitFor(() => {
      expect(screen.getByTitle('Session preview')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('preview-heatmap')).not.toBeInTheDocument();
  });
});
