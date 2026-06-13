import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Session #142</CardTitle>
        <CardDescription>Started 4 minutes ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-fg-muted">
          The current page contains a CDP-instrumented preview of the active tab.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Open
        </Button>
        <Button variant="ghost" size="sm">
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const Minimal: Story = {
  render: () => (
    <Card className="w-80 p-5">
      <p className="text-sm text-fg">A bare card with body content only.</p>
    </Card>
  ),
};

export const Stat: Story = {
  render: () => (
    <Card className="w-64 p-5">
      <div className="text-xs uppercase tracking-wider text-fg-faint">Active sessions</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-fg">128</div>
      <div className="mt-1 text-xs text-success">+12.4% vs last week</div>
    </Card>
  ),
};
