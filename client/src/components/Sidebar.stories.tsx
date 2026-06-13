import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from './Sidebar';

import type { Meta, StoryObj } from '@storybook/react';

import { useAppStore } from '@/lib/store';

const meta = {
  title: 'Composed/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/dashboard']}>
        <div className="h-screen flex bg-bg">
          <Story />
          <main className="flex-1" />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  beforeEach: () => {
    // Force the Zustand store into the expanded state for this story.
    if (useAppStore.getState().sidebarCollapsed) {
      useAppStore.getState().toggleSidebarCollapsed();
    }
  },
};

export const Collapsed: Story = {
  beforeEach: () => {
    if (!useAppStore.getState().sidebarCollapsed) {
      useAppStore.getState().toggleSidebarCollapsed();
    }
  },
};
