import { Activity, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

import { Badge } from './badge';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'outline', 'accent', 'success', 'warning', 'danger', 'live', 'solid'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { children: 'Badge', variant: 'neutral', size: 'md' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Accent: Story = {
  args: { variant: 'accent', children: 'New' },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: (
      <>
        <CheckCircle2 />
        Passing
      </>
    ),
  },
};

export const Warning: Story = {
  args: { variant: 'warning', children: 'Pending' },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: (
      <>
        <AlertCircle />
        Failed
      </>
    ),
  },
};

export const Live: Story = {
  args: {
    variant: 'live',
    children: (
      <>
        <Activity />
        Recording
      </>
    ),
  },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Beta' },
};

/** Compare every variant side-by-side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="accent">
        <Sparkles />
        Accent
      </Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="live">Live</Badge>
      <Badge variant="solid">Solid</Badge>
    </div>
  ),
};
