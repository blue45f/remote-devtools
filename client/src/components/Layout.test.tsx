import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";

import { useAppStore } from "@/lib/store";
import { renderWithProviders } from "@/test/utils";

import Layout from "./Layout";

function HomeMock() {
  return <div>page-content</div>;
}

beforeEach(() => {
  useAppStore.setState({
    commandOpen: false,
    sidebarOpen: false,
    sidebarCollapsed: false,
    demoMode: false,
  });
});

afterEach(() => {
  useAppStore.setState({
    commandOpen: false,
    sidebarOpen: false,
    sidebarCollapsed: false,
    demoMode: false,
  });
  localStorage.clear();
});

describe("Layout", () => {
  it("renders sidebar, topbar and the routed Outlet", () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomeMock />} />
        </Route>
      </Routes>,
    );
    expect(screen.getByText("page-content")).toBeInTheDocument();
    // Layout renders both desktop and mobile-drawer sidebars, so each link
    // appears twice. We only assert there is at least one.
    expect(
      screen.getAllByRole("link", { name: /Dashboard/ }).length,
    ).toBeGreaterThan(0);
  });

  it("opens the command palette when Cmd+K is pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomeMock />} />
        </Route>
      </Routes>,
    );
    expect(useAppStore.getState().commandOpen).toBe(false);
    await user.keyboard("{Meta>}k{/Meta}");
    expect(useAppStore.getState().commandOpen).toBe(true);
  });
});
