import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import Sessions from "./Sessions";

beforeEach(() => {
  // Demo mode short-circuits apiFetch to seed data — avoids any real network.
  localStorage.setItem("demo-mode", "1");
});

describe("Sessions page", () => {
  it("renders the title, controls and a table of seeded sessions", async () => {
    renderWithProviders(<Sessions />);

    expect(
      screen.getByRole("heading", { name: "Sessions", level: 1 }),
    ).toBeInTheDocument();

    // Wait for skeleton to be replaced with real rows
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    // Tabs
    expect(screen.getByRole("tab", { name: /Recorded/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live/ })).toBeInTheDocument();
  });

  it("filters rows when the user types in the search box", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText(/Search by name, URL/);
    await user.type(search, "billing");

    expect(screen.queryByText(/checkout-flow-test/)).not.toBeInTheDocument();
    expect(screen.getByText(/billing-modal-bug/)).toBeInTheDocument();
  });

  it("toggles between table and grid views", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    expect(document.querySelector("table")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Grid view/ }));
    await waitFor(() => {
      expect(document.querySelector("table")).not.toBeInTheDocument();
    });
  });

  it("switches to live tab and shows live entries only", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Live/ }));

    await waitFor(() => {
      // Live sessions in the seed are the last two
      expect(screen.getByText(/live-stream-debug/)).toBeInTheDocument();
    });
    // Recorded entries should be gone
    expect(screen.queryByText(/checkout-flow-test/)).not.toBeInTheDocument();
  });

  it("clears filters via the chip's Clear button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "< 30s" }));
    await waitFor(() => {
      expect(
        screen.queryByText(/onboarding-step-fail/),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Clear/ }));
    await waitFor(() => {
      expect(screen.getByText(/onboarding-step-fail/)).toBeInTheDocument();
    });
  });

  it("each row exposes a 'Detail' link to the right session", async () => {
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const row = screen.getByText(/checkout-flow-test/).closest("tr");
    expect(row).not.toBeNull();
    const detail = within(row as HTMLElement).getByRole("link", {
      name: /View session details/,
    });
    expect(detail.getAttribute("href")).toMatch(/^\/sessions\/\d+$/);
  });
});
