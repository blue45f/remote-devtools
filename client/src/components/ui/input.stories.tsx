import { Lock, Mail, Search } from 'lucide-react';

import { Input } from './input';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: {
    placeholder: 'Type something…',
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLeadingIcon: Story = {
  args: {
    leadingIcon: <Search />,
    placeholder: 'Search sessions…',
  },
};

export const WithTrailingIcon: Story = {
  args: {
    trailingIcon: <Lock />,
    placeholder: 'Locked field',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    leadingIcon: <Mail />,
    placeholder: 'you@company.com',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Cannot edit',
  },
};

export const Filled: Story = {
  args: {
    defaultValue: 'remote-devtools',
  },
};
