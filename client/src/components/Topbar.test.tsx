import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "@/lib/store";
import { renderWithProviders } from "@/test/utils";

import { Topbar } from "./Topbar";

beforeEach(() => {
  useAppStore.setState({ demoMode: false });
});

afterEach(() => {
  useAppStore.setState({ demoMode: false });
});

describe("Topbar", () => {
  it("builds breadcrumbs from the current pathname", () => {
    renderWithProviders(<Topbar />, {
      routerProps: { initialEntries: ["/sessions/42"] },
    });
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("links non-leaf breadcrumbs back to their section", () => {
    renderWithProviders(<Topbar />, {
      routerProps: { initialEntries: ["/sessions/42"] },
    });
    const sessionsLink = screen.getByRole("link", { name: "Sessions" });
    expect(sessionsLink).toHaveAttribute("href", "/sessions");
  });

  it("shows the demo badge only when demo mode is active", () => {
    const { rerender } = renderWithProviders(<Topbar />);
    expect(screen.queryByTestId("demo-mode-badge")).not.toBeInTheDocument();

    useAppStore.setState({ demoMode: true });
    rerender(<Topbar />);
    expect(screen.getByTestId("demo-mode-badge")).toBeInTheDocument();
  });

  it("renders a search trigger that opens the command palette", () => {
    renderWithProviders(<Topbar />);
    const trigger = screen.getByRole("button", {
      name: /Open command palette/,
    });
    expect(trigger).toBeInTheDocument();
  });
});
