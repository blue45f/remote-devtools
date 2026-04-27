import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders the children", () => {
    render(<Button>Save</Button>);
    expect(
      screen.getByRole("button", { name: "Save" }),
    ).toBeInTheDocument();
  });

  it("forwards click events", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies the chosen variant class", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-danger/);
  });

  it("supports asChild via Slot", () => {
    render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toHaveAttribute("href", "/x");
  });

  it("applies the icon size when size=icon", () => {
    render(
      <Button size="icon" aria-label="More">
        <svg />
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/size-9/);
  });
});
