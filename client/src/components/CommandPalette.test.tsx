import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "@/lib/store";
import { renderWithProviders } from "@/test/utils";

import { CommandPalette } from "./CommandPalette";

beforeEach(() => {
  useAppStore.setState({ commandOpen: true, demoMode: false });
});

afterEach(() => {
  useAppStore.setState({ commandOpen: false, demoMode: false });
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

    await user.type(
      screen.getByPlaceholderText(/Type a command/),
      "dashboard",
    );
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
});
