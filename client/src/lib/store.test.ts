import { beforeEach, describe, expect, it } from "vitest";

import { applyTheme, useAppStore } from "./store";

function reset() {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  // The store reads localStorage on first import; reset the values directly.
  useAppStore.setState({
    sidebarOpen: false,
    sidebarCollapsed: false,
    theme: "system",
    commandOpen: false,
    demoMode: false,
  });
}

describe("useAppStore", () => {
  beforeEach(reset);

  it("toggles the sidebar", () => {
    expect(useAppStore.getState().sidebarOpen).toBe(false);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(true);
    useAppStore.getState().setSidebarOpen(false);
    expect(useAppStore.getState().sidebarOpen).toBe(false);
  });

  it("persists sidebar collapsed state to localStorage", () => {
    useAppStore.getState().toggleSidebarCollapsed();
    expect(localStorage.getItem("sidebar-collapsed")).toBe("1");
    useAppStore.getState().toggleSidebarCollapsed();
    expect(localStorage.getItem("sidebar-collapsed")).toBe("0");
  });

  it("persists theme and applies the dark class", () => {
    useAppStore.getState().setTheme("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useAppStore.getState().setTheme("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles command palette open state", () => {
    expect(useAppStore.getState().commandOpen).toBe(false);
    useAppStore.getState().toggleCommand();
    expect(useAppStore.getState().commandOpen).toBe(true);
  });

  it("persists demo mode to localStorage", () => {
    useAppStore.getState().setDemoMode(true);
    expect(localStorage.getItem("demo-mode")).toBe("1");
    expect(useAppStore.getState().demoMode).toBe(true);

    useAppStore.getState().toggleDemoMode();
    expect(localStorage.getItem("demo-mode")).toBeNull();
    expect(useAppStore.getState().demoMode).toBe(false);
  });
});

describe("applyTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("adds the dark class when theme is dark", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class when theme is light", () => {
    document.documentElement.classList.add("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
