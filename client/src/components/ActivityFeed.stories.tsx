import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { ActivityFeed } from './ActivityFeed';

import type { Meta, StoryObj } from '@storybook/react';

import { useAppStore } from '@/lib/store';

/**
 * ActivityFeed pulls data through `apiFetch`, which the app's demo-mode short
 * circuits to seeded fixtures. Stories toggle demo mode on/off in `beforeEach`
 * to render against the seed router without touching a real backend.
 */
const meta = {
  title: 'Composed/ActivityFeed',
  component: ActivityFeed,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => {
      const client = new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      });
      return (
        <MemoryRouter>
          <QueryClientProvider client={client}>
            <div className="max-w-2xl">
              <Story />
            </div>
          </QueryClientProvider>
        </MemoryRouter>
      );
    },
  ],
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: () => {
    useAppStore.getState().setDemoMode(true);
  },
  args: { pollMs: 0, limit: 8 },
};

export const Compact: Story = {
  beforeEach: () => {
    useAppStore.getState().setDemoMode(true);
  },
  args: { pollMs: 0, limit: 4 },
};
