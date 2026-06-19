import ErrorBoundary from './ErrorBoundary';

import type { Meta, StoryObj } from '@storybook/react';

/**
 * ErrorBoundary renders the fallback when a child throws. To showcase that
 * state in Storybook we deliberately throw from a child component during
 * render. The boundary catches it and shows the recovery UI.
 */
function Bomb({ message = 'Replay buffer overflowed at frame 142' }: { message?: string }): never {
  throw new Error(message);
}

const meta = {
  title: 'Composed/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  args: {
    children: <div className="p-12 text-sm text-fg">All good — nothing is currently broken.</div>,
  },
};

export const CaughtError: Story = {
  args: {
    children: <Bomb />,
  },
};

export const CustomMessage: Story = {
  args: {
    children: <Bomb message="Failed to load /api/sessions/142: 503" />,
  },
};
