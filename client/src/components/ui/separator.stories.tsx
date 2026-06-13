import { Separator } from './separator';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <div className="text-sm text-fg">Above</div>
      <Separator className="my-3" />
      <div className="text-sm text-fg">Below</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-12 items-center gap-3 text-sm text-fg">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};
