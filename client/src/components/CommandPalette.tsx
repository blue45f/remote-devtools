import { Keyboard, Monitor, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { toast } from "@/components/ui/toaster";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { queryClient } from "@/lib/api";
import { allNavItems } from "@/lib/nav";
import { useAppStore } from "@/lib/store";

export function CommandPalette() {
  const navigate = useNavigate();
  const commandOpen = useAppStore((s) => s.commandOpen);
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const setTheme = useAppStore((s) => s.setTheme);
  const demoMode = useAppStore((s) => s.demoMode);
  const toggleDemoMode = useAppStore((s) => s.toggleDemoMode);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);

  const run = (fn: () => void) => {
    fn();
    setCommandOpen(false);
  };

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.to}
                value={`nav ${item.label}`}
                onSelect={() => run(() => navigate(item.to))}
              >
                <Icon />
                <span>{item.label}</span>
                {item.shortcut && (
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Appearance">
          <CommandItem
            value="theme light"
            onSelect={() => run(() => setTheme("light"))}
          >
            <Sun />
            <span>Light theme</span>
          </CommandItem>
          <CommandItem
            value="theme dark"
            onSelect={() => run(() => setTheme("dark"))}
          >
            <Moon />
            <span>Dark theme</span>
          </CommandItem>
          <CommandItem
            value="theme system"
            onSelect={() => run(() => setTheme("system"))}
          >
            <Monitor />
            <span>System theme</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Demo">
          <CommandItem
            value="toggle demo"
            onSelect={() =>
              run(() => {
                toggleDemoMode();
                queryClient.invalidateQueries();
                toast.success(
                  demoMode ? "Demo mode disabled" : "Demo mode enabled",
                  {
                    description: demoMode
                      ? "Returning to live network requests."
                      : "Showing rich seed data while the backend is offline.",
                  },
                );
              })
            }
          >
            <Sparkles />
            <span>{demoMode ? "Disable demo mode" : "Enable demo mode"}</span>
            <CommandShortcut>{demoMode ? "ON" : "OFF"}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Help">
          <CommandItem
            value="show keyboard shortcuts"
            onSelect={() => run(() => setShortcutsOpen(true))}
          >
            <Keyboard />
            <span>Keyboard shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="reset sessions preferences"
            onSelect={() =>
              run(() => {
                try {
                  window.localStorage.removeItem("sessions-prefs:v1");
                  window.localStorage.removeItem("sessions-pins:v1");
                  toast.success("Sessions preferences cleared", {
                    description:
                      "Reload the Sessions page for view / sort / pins to reset.",
                  });
                } catch {
                  toast.error("Couldn't clear preferences");
                }
              })
            }
          >
            <RotateCcw />
            <span>Reset Sessions preferences</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
