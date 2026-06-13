import { Kbd } from './kbd';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { children: 'K' },
};

export const Combo: Story = {
  render: () => (
    <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
      <span>to open the command palette</span>
    </span>
  ),
};

export const ArrowKeys: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <Kbd>←</Kbd>
      <Kbd>→</Kbd>
    </div>
  ),
};
