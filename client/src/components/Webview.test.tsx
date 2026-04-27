import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock so the factory closes over a real reference.
const { createDebuggerMock } = vi.hoisted(() => ({
  createDebuggerMock: vi.fn(),
}));
vi.mock("remote-debug-sdk", () => ({
  createDebugger: createDebuggerMock,
}));

import { WebviewPage } from "./Webview";

function clearInjectedScripts() {
  document.head
    .querySelectorAll('script[src*="sdk/index.umd.js"]')
    .forEach((s) => s.remove());
}

beforeEach(() => {
  createDebuggerMock.mockClear();
  clearInjectedScripts();
});

afterEach(() => {
  clearInjectedScripts();
});

describe("WebviewPage", () => {
  it("invokes createDebugger via dynamic import for the module kind", async () => {
    render(<WebviewPage kind="module" />);
    // Yield to the dynamic-import promise + the queued microtasks.
    await new Promise((r) => setTimeout(r, 0));
    expect(createDebuggerMock).toHaveBeenCalled();
  });

  it("injects a UMD script tag for the script kind", () => {
    render(<WebviewPage kind="script" />);
    expect(
      document.head.querySelector('script[src*="sdk/index.umd.js"]'),
    ).not.toBeNull();
  });

  it("renders both Customer page and Debug actions tabs", () => {
    render(<WebviewPage />);
    expect(
      screen.getByRole("tab", { name: /Customer page/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Debug actions/ }),
    ).toBeInTheDocument();
  });

  it("switches to Debug actions tab when clicked", async () => {
    const user = userEvent.setup();
    render(<WebviewPage />);
    await user.click(screen.getByRole("tab", { name: /Debug actions/ }));
    expect(
      screen.getByRole("heading", { name: /SDK debug panel/ }),
    ).toBeInTheDocument();
  });

  it("shows the SDK badge that matches the chosen kind", () => {
    const { rerender } = render(<WebviewPage kind="module" />);
    expect(screen.getByText("Module SDK")).toBeInTheDocument();
    rerender(<WebviewPage kind="script" />);
    expect(screen.getByText(/Script SDK \(UMD\)/)).toBeInTheDocument();
  });
});
