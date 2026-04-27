import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ExploreTab from "./ExploreTab";

describe("ExploreTab", () => {
  it("renders the hero copy and search input", () => {
    render(<ExploreTab domNodes={[]} />);
    expect(screen.getByText(/Discover your next/)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search destinations/),
    ).toBeInTheDocument();
  });

  it("shows the destinations list", () => {
    render(<ExploreTab domNodes={[]} />);
    expect(screen.getByText(/Santorini, Greece/)).toBeInTheDocument();
    expect(screen.getByText(/Kyoto, Japan/)).toBeInTheDocument();
  });

  it("displays captured DOM nodes when present", () => {
    render(<ExploreTab domNodes={["가", "나", "다"]} />);
    expect(screen.getByText(/Captured DOM nodes \(3\)/)).toBeInTheDocument();
  });

  it("accepts text into the search input", async () => {
    const user = userEvent.setup();
    render(<ExploreTab domNodes={[]} />);
    const input = screen.getByPlaceholderText(/Search destinations/);
    await user.type(input, "Bali");
    expect(input).toHaveValue("Bali");
  });
});
