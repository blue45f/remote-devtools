import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={Activity}
        title="No data"
        description="Add some data to see this section."
      />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(
      screen.getByText("Add some data to see this section."),
    ).toBeInTheDocument();
  });

  it("renders an action when provided", () => {
    render(
      <EmptyState
        icon={Activity}
        title="Empty"
        action={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
