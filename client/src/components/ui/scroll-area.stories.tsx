import { ScrollArea } from './scroll-area';
import { Separator } from './separator';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-64 w-64 rounded-md border border-border bg-surface">
      <div className="p-4">
        <h4 className="mb-2 text-sm font-semibold text-fg">Tags</h4>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="text-sm text-fg-muted">
            v0.{i.toString().padStart(2, '0')}
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
