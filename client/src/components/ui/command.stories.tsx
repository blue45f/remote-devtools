import type { Meta, StoryObj } from "@storybook/react";
import {
  LayoutDashboard,
  PlaySquare,
  Settings,
  Sparkles,
  Sun,
  TerminalSquare,
  User,
} from "lucide-react";
import { useState } from "react";

import { Button } from "./button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

const meta = {
  title: "UI/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  render: () => (
    <div className="w-[420px] rounded-xl border border-border bg-surface shadow-md">
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem>
              <LayoutDashboard />
              <span>Dashboard</span>
              <CommandShortcut>G D</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <PlaySquare />
              <span>Sessions</span>
              <CommandShortcut>G S</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <TerminalSquare />
              <span>SDK sandbox</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Preferences">
            <CommandItem>
              <Sun />
              <span>Toggle theme</span>
            </CommandItem>
            <CommandItem>
              <Sparkles />
              <span>Enable demo mode</span>
            </CommandItem>
            <CommandItem>
              <User />
              <span>Profile</span>
            </CommandItem>
            <CommandItem>
              <Settings />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};

export const AsDialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open palette
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Search anything…" />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup heading="Sessions">
              <CommandItem>
                <PlaySquare />
                <span>Session #142 – Chrome / macOS</span>
              </CommandItem>
              <CommandItem>
                <PlaySquare />
                <span>Session #141 – Safari / iOS</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    );
  },
};
