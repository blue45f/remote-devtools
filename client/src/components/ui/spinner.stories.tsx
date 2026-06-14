import { Spinner } from './spinner';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'Loading session…' },
};

export const Large: Story = {
  args: { className: 'size-8' },
};
