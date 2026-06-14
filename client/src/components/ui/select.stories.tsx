import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Choose a device…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="chrome-mac">Chrome / macOS</SelectItem>
        <SelectItem value="chrome-win">Chrome / Windows</SelectItem>
        <SelectItem value="safari-ios">Safari / iOS</SelectItem>
        <SelectItem value="firefox-mac">Firefox / macOS</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Grouped: Story = {
  render: () => (
    <Select defaultValue="last-24h">
      <SelectTrigger>
        <SelectValue placeholder="Pick a range" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Recent</SelectLabel>
          <SelectItem value="last-15m">Last 15 minutes</SelectItem>
          <SelectItem value="last-hour">Last hour</SelectItem>
          <SelectItem value="last-24h">Last 24 hours</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Wider</SelectLabel>
          <SelectItem value="last-week">Last week</SelectItem>
          <SelectItem value="last-month">Last month</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger>
        <SelectValue placeholder="Unavailable" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="x">Hidden</SelectItem>
      </SelectContent>
    </Select>
  ),
};
