import { Inbox, PlaySquare, Search } from 'lucide-react';

import { Button } from './button';
import { EmptyState } from './empty-state';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[420px] rounded-xl border border-border bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Inbox,
    title: 'Nothing here yet',
    description: "When your customers report issues, you'll see them here.",
  },
};

export const WithAction: Story = {
  args: {
    icon: PlaySquare,
    title: 'No sessions recorded',
    description: 'Drop the SDK into your site to start capturing sessions.',
    action: <Button variant="accent">View install guide</Button>,
  },
};

export const SearchEmpty: Story = {
  args: {
    icon: Search,
    title: 'No matches',
    description: 'Try a different filter or clear the search.',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'All caught up',
  },
};
