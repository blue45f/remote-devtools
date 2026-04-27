import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("renders the visible label when provided", () => {
    render(<Spinner label="Loading…" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("falls back to a screen-reader-only label when no label is given", () => {
    render(<Spinner />);
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("exposes itself as a status region for assistive tech", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
