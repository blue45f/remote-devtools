import { Brand, BrandMark } from './Brand';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Composed/Brand',
  component: Brand,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { collapsed: false },
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  args: { collapsed: true },
};

export const MarkOnly: Story = {
  render: () => <BrandMark className="size-12" />,
};
