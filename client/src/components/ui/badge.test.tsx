import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders text content", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies variant styles", () => {
    const { rerender } = render(<Badge variant="success">ok</Badge>);
    expect(screen.getByText("ok").className).toMatch(/bg-success-soft/);
    rerender(<Badge variant="danger">no</Badge>);
    expect(screen.getByText("no").className).toMatch(/bg-danger-soft/);
  });

  it("applies size styles", () => {
    render(<Badge size="sm">x</Badge>);
    expect(screen.getByText("x").className).toMatch(/h-5/);
  });
});
