import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Kbd } from "./kbd";

describe("Kbd", () => {
  it("renders the keystroke text", () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("uses a <kbd> element semantically", () => {
    const { container } = render(<Kbd>⌘</Kbd>);
    expect(container.querySelector("kbd")).not.toBeNull();
  });
});
