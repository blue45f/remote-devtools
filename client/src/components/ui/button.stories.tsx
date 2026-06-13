import { ArrowRight, Plus, Trash2 } from 'lucide-react';

import { Button } from './button';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'accent', 'secondary', 'outline', 'ghost', 'soft', 'danger', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon', 'icon-sm'],
    },
    disabled: { control: 'boolean' },
    asChild: { control: false },
  },
  args: {
    children: 'Button',
    variant: 'secondary',
    size: 'md',
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = {
  args: { variant: 'primary', children: 'Continue' },
};

export const Accent: Story = {
  args: { variant: 'accent', children: 'Save changes' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Cancel' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Dismiss' },
};

export const Soft: Story = {
  args: { variant: 'soft', children: 'Learn more' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete' },
};

export const LinkVariant: Story = {
  args: { variant: 'link', children: 'Read the docs' },
};

export const WithIcon: Story = {
  args: {
    variant: 'accent',
    children: (
      <>
        <Plus />
        New session
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
    children: <Trash2 />,
    'aria-label': 'Delete',
  },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Unavailable' },
};

/** Matrix view: every variant × every size combination in one frame. */
export const Matrix: Story = {
  parameters: { layout: 'padded' },
  render: () => {
    const variants = [
      'primary',
      'accent',
      'secondary',
      'outline',
      'ghost',
      'soft',
      'danger',
    ] as const;
    const sizes = ['sm', 'md', 'lg'] as const;
    return (
      <div className="space-y-4">
        {variants.map((variant) => (
          <div key={variant} className="flex items-center gap-3">
            <span className="w-24 text-xs uppercase tracking-wider text-fg-subtle">{variant}</span>
            {sizes.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant === 'danger' ? 'Delete' : 'Action'}
                {size === 'lg' && <ArrowRight />}
              </Button>
            ))}
          </div>
        ))}
      </div>
    );
  },
};
