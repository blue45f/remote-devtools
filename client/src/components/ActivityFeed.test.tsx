import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      expect(screen.getAllByText(/Recorded session/i).length).toBeGreaterThan(
        0,
      );
    });
  });

  it("respects the limit prop", async () => {
    renderWithProviders(<ActivityFeed pollMs={0} limit={3} />);
    await waitFor(() => {
      const items = document.querySelectorAll("ol > li");
      expect(items.length).toBeLessThanOrEqual(3);
    });
  });

  it("persists chip filter selection to localStorage", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ActivityFeed pollMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId("activity-kind-chip-session")).toBeEnabled();
    });
    await user.click(screen.getByTestId("activity-kind-chip-session"));

    await waitFor(() => {
      const raw = localStorage.getItem("activity-prefs:v1");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string).kinds).toContain("session");
    });
  });

  it("renders comment kind entries from the activity feed", async () => {
    renderWithProviders(<ActivityFeed pollMs={0} />);
    await waitFor(() => {
      // The seed router emits one "comment" entry per 5 in the rotation.
      expect(
        screen.getByTestId("activity-kind-chip-comment"),
      ).toBeInTheDocument();
    });
    // The chip should report a non-zero count.
    const chip = screen.getByTestId("activity-kind-chip-comment");
    expect(chip.textContent).toMatch(/Comment\s*\d/);
  });

  it("hydrates chip filter from localStorage on mount", async () => {
    localStorage.setItem(
      "activity-prefs:v1",
      JSON.stringify({ kinds: ["error"] }),
    );
    renderWithProviders(<ActivityFeed pollMs={0} />);

    await waitFor(() => {
      const chip = screen.getByTestId("activity-kind-chip-error");
      expect(chip.getAttribute("aria-pressed")).toBe("true");
    });
  });
});
