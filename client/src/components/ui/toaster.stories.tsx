import { Button } from './button';
import { Toaster, toast } from './toaster';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Toaster',
  component: Toaster,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="flex flex-col items-center gap-4">
        <Story />
        <Toaster />
      </div>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Triggers: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={() => toast('Saved', { description: 'Changes synced to the server.' })}
      >
        Default
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.success('Session uploaded', {
            description: 'All 1.2k events flushed.',
          })
        }
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning('Slow network', { description: 'Retrying upload…' })}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error('Upload failed', { description: 'Connection refused' })}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast('Replay paused', {
            description: 'Press space to resume.',
            action: {
              label: 'Resume',
              onClick: () => toast.success('Resumed'),
            },
          })
        }
      >
        With action
      </Button>
    </div>
  ),
};
