import { Skeleton } from './skeleton';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Block: Story = {
  args: { className: 'h-8 w-48' },
};

export const Avatar: Story = {
  args: { className: 'size-10 rounded-full' },
};

export const Row: Story = {
  render: () => (
    <div className="flex items-center gap-3 w-80">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-80 rounded-xl border border-border bg-surface p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  ),
};
