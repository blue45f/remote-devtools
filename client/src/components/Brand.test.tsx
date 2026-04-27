import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Brand, BrandMark } from "./Brand";

describe("Brand", () => {
  it("renders the wordmark when not collapsed", () => {
    render(<Brand />);
    expect(screen.getByText("Remote DevTools")).toBeInTheDocument();
    expect(screen.getByText("v0.1")).toBeInTheDocument();
  });

  it("hides the wordmark when collapsed", () => {
    render(<Brand collapsed />);
    expect(screen.queryByText("Remote DevTools")).not.toBeInTheDocument();
  });
});

describe("BrandMark", () => {
  it("renders an SVG", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
