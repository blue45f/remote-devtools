import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renders a plain input when no icons are provided", () => {
    render(<Input placeholder="search" />);
    expect(screen.getByPlaceholderText("search")).toBeInTheDocument();
  });

  it("captures user input", async () => {
    const onChange = vi.fn();
    render(<Input placeholder="q" onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("q"), "hi");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders leading and trailing icons in the wrapped variant", () => {
    render(
      <Input
        placeholder="x"
        leadingIcon={<span data-testid="lead">L</span>}
        trailingIcon={<span data-testid="trail">T</span>}
      />,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });
});
