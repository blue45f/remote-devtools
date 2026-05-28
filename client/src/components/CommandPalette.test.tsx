import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "@/lib/store";
import { renderWithProviders } from "@/test/utils";

import { CommandPalette } from "./CommandPalette";

beforeEach(() => {
  act(() => {
    useAppStore.setState({ commandOpen: true, demoMode: false });
  });
});

afterEach(() => {
  act(() => {
    useAppStore.setState({ commandOpen: false, demoMode: false });
  });
  localStorage.clear();
});

describe("CommandPalette", () => {
  it("renders navigation, appearance and demo groups when open", () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText(/Enable demo mode/)).toBeInTheDocument();
  });

  it("filters entries by search input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.type(screen.getByPlaceholderText(/Type a command/), "dashboard");
    await waitFor(() => {
      expect(screen.queryByText("Sessions")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("toggles demo mode through the palette and persists to localStorage", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.click(screen.getByText(/Enable demo mode/));
    await waitFor(() => {
      expect(useAppStore.getState().demoMode).toBe(true);
    });
    expect(localStorage.getItem("demo-mode")).toBe("1");
  });

  it("surfaces recent sessions from localStorage when present", () => {
    localStorage.setItem(
      "recent-sessions:v1",
      JSON.stringify([
        {
          id: "abc123",
          name: "checkout-flow-test",
          url: "https://shop.example.com/cart/checkout",
          visitedAt: Date.now(),
        },
      ]),
    );
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText("Recent sessions")).toBeInTheDocument();
    expect(screen.getByText("checkout-flow-test")).toBeInTheDocument();
    expect(screen.getByText("shop.example.com")).toBeInTheDocument();
  });

  it("hides the recent group entirely when no history exists", () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByText("Recent sessions")).not.toBeInTheDocument();
  });

  it("toggles replay skip-idle from the palette", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette />);

    await user.click(screen.getByTestId("cmd-toggle-skip-idle"));
    await waitFor(() => {
      expect(localStorage.getItem("replay-prefs:v1")).toContain(
        '"skipInactive":true',
      );
    });
  });

  it("Reset Sessions preferences also wipes recent-sessions", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sessions-prefs:v1", '{"view":"table"}');
    localStorage.setItem("sessions-pins:v1", '["abc"]');
    localStorage.setItem(
      "recent-sessions:v1",
      JSON.stringify([{ id: "abc", visitedAt: 1 }]),
    );

    renderWithProviders(<CommandPalette />);
    await user.click(screen.getByText("Reset Sessions preferences"));

    await waitFor(() => {
      expect(localStorage.getItem("sessions-prefs:v1")).toBeNull();
    });
    expect(localStorage.getItem("sessions-pins:v1")).toBeNull();
    expect(localStorage.getItem("recent-sessions:v1")).toBeNull();
  });
});
