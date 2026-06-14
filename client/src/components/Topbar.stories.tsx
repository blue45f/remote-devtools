import { MemoryRouter } from 'react-router-dom';

import { Topbar } from './Topbar';

import type { Meta, StoryObj } from '@storybook/react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';

const meta = {
  title: 'Composed/Topbar',
  component: Topbar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, ctx) => {
      const route = (ctx.parameters.route as string | undefined) ?? '/dashboard';
      return (
        <MemoryRouter initialEntries={[route]}>
          <TooltipProvider delayDuration={150}>
            <div className="min-h-[8rem] bg-bg">
              <Story />
            </div>
          </TooltipProvider>
        </MemoryRouter>
      );
    },
  ],
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashboard: Story = {
  parameters: { route: '/dashboard' },
  beforeEach: () => {
    useAppStore.getState().setDemoMode(false);
  },
};

export const DemoMode: Story = {
  parameters: { route: '/sessions' },
  beforeEach: () => {
    useAppStore.getState().setDemoMode(true);
  },
};

export const DeepCrumbs: Story = {
  parameters: { route: '/sessions/142' },
  beforeEach: () => {
    useAppStore.getState().setDemoMode(false);
  },
};
