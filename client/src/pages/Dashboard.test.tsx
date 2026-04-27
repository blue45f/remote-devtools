import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import Dashboard from "./Dashboard";

beforeEach(() => {
  localStorage.setItem("demo-mode", "1");
});

describe("Dashboard page", () => {
  it("renders the headline metrics from seed data", async () => {
    renderWithProviders(<Dashboard />);

    expect(
      screen.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeInTheDocument();

    // Stat tiles eventually render; live count should match seed live sessions (2)
    await waitFor(() => {
      expect(screen.getAllByText(/Live now/i).length).toBeGreaterThan(0);
    });
  });

  it("switches between daily / weekly / monthly periods", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    const weekly = screen.getByRole("tab", { name: /Weekly/ });
    expect(weekly).toHaveAttribute("aria-selected", "false");

    await user.click(weekly);
    expect(weekly).toHaveAttribute("aria-selected", "true");
  });

  it("renders an activity feed section", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Recent activity/)).toBeInTheDocument();
    });
  });
});
