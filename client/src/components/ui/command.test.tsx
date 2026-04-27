import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

describe("Command (cmdk)", () => {
  it("filters items by typed query", async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput placeholder="search" />
        <CommandList>
          <CommandEmpty>none</CommandEmpty>
          <CommandGroup heading="Group">
            <CommandItem value="apple">apple</CommandItem>
            <CommandItem value="banana">banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    await user.type(screen.getByPlaceholderText("search"), "banan");
    expect(screen.queryByText("apple")).not.toBeInTheDocument();
    expect(screen.getByText("banana")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput placeholder="search" />
        <CommandList>
          <CommandEmpty>no matches</CommandEmpty>
          <CommandGroup heading="Group">
            <CommandItem value="apple">apple</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    await user.type(screen.getByPlaceholderText("search"), "zzzzz");
    expect(screen.getByText("no matches")).toBeInTheDocument();
  });

  it("invokes onSelect on Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput placeholder="search" />
        <CommandList>
          <CommandGroup heading="Group">
            <CommandItem value="apple" onSelect={onSelect}>
              apple
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    await user.type(screen.getByPlaceholderText("search"), "apple");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalled();
  });
});
