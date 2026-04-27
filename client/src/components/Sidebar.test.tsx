import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "@/lib/store";
import { renderWithProviders } from "@/test/utils";

import { Sidebar } from "./Sidebar";

beforeEach(() => {
  useAppStore.setState({ sidebarCollapsed: false });
});

afterEach(() => {
  useAppStore.setState({ sidebarCollapsed: false });
  localStorage.clear();
});

describe("Sidebar", () => {
  it("renders the brand and every nav item", () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText("Remote DevTools")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Dashboard/ }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.getByRole("link", { name: /Sessions/ }),
    ).toHaveAttribute("href", "/sessions");
    expect(
      screen.getByRole("link", { name: /Module SDK/ }),
    ).toHaveAttribute("href", "/sandbox/module");
    expect(
      screen.getByRole("link", { name: /Script SDK/ }),
    ).toHaveAttribute("href", "/sandbox/script");
  });

  it("shows the SDK Playground section heading", () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText("SDK Playground")).toBeInTheDocument();
  });

  it("collapses to icon-only mode and persists to localStorage", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sidebar />);

    await user.click(
      screen.getByRole("button", { name: /Collapse sidebar/ }),
    );
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem("sidebar-collapsed")).toBe("1");
  });

  it("invokes onItemClick when a nav link is clicked", async () => {
    const user = userEvent.setup();
    let called = 0;
    renderWithProviders(<Sidebar onItemClick={() => (called += 1)} />);
    await user.click(screen.getByRole("link", { name: /Sessions/ }));
    expect(called).toBe(1);
  });
});
