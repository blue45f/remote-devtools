import { Copy, Download, LogOut, Settings, Trash2, User } from 'lucide-react';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './dropdown-menu';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Copy />
          <span>Copy ID</span>
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download />
          <span>Export JSON</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger focus:bg-danger-soft focus:text-danger">
          <Trash2 />
          <span>Delete session</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const Account: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <User />
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Signed in as ada</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithCheckboxes: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Filter columns</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>ID</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>Device</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Duration</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>Started</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
