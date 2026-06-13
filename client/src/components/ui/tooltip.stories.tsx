import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={150}>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Shortcut: ⌘K</TooltipContent>
    </Tooltip>
  ),
};

export const Sides: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="grid grid-cols-2 gap-12 place-items-center p-24">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} defaultOpen>
          <TooltipTrigger asChild>
            <Button variant="outline">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Side: {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};
