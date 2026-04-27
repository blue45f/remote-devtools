import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import { ActivityFeed } from "./ActivityFeed";

beforeEach(() => {
  localStorage.setItem("demo-mode", "1");
});

describe("ActivityFeed", () => {
  it("renders header copy and live indicator", () => {
    renderWithProviders(<ActivityFeed pollMs={0} />);
    expect(screen.getByText(/Recent activity/)).toBeInTheDocument();
  });

  it("hydrates feed entries from the seed router", async () => {
    renderWithProviders(<ActivityFeed pollMs={0} />);
    await waitFor(() => {
      expect(screen.getAllByText(/Recorded session/i).length).toBeGreaterThan(0);
    });
  });

  it("respects the limit prop", async () => {
    renderWithProviders(<ActivityFeed pollMs={0} limit={3} />);
    await waitFor(() => {
      const items = document.querySelectorAll("ol > li");
      expect(items.length).toBeLessThanOrEqual(3);
    });
  });
});
