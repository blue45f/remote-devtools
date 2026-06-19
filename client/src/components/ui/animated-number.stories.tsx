import { useEffect, useState } from 'react';

import { AnimatedNumber } from './animated-number';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/AnimatedNumber',
  component: AnimatedNumber,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    value: { control: { type: 'number' } },
    duration: { control: { type: 'number', min: 0, step: 100 } },
  },
} satisfies Meta<typeof AnimatedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Self-driving demo that ticks the value upward. Lives in its own PascalCase
 *  component so the hooks sit in a real component, not the story render fn. */
function TickingDemo() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => v + Math.floor(Math.random() * 60)), 1200);
    return () => clearInterval(t);
  }, []);
  return <AnimatedNumber value={n} className="text-4xl font-semibold tabular-nums text-fg" />;
}

export const Default: Story = {
  args: {
    value: 1284,
    className: 'text-4xl font-semibold text-fg',
  },
};

export const Currency: Story = {
  args: {
    value: 24500,
    format: (n) =>
      n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    className: 'text-3xl font-semibold text-success',
  },
};

export const Ticking: Story = {
  args: { value: 0 },
  parameters: {
    docs: {
      description: {
        story:
          'Drives the value with a setInterval to demonstrate the spring animation in motion. The `value` arg seeds the initial frame.',
      },
    },
  },
  render: () => <TickingDemo />,
};
