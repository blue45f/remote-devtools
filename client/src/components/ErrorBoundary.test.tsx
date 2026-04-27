import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "./ErrorBoundary";

function Boom({ message = "kaboom" }: { message?: string }): never {
  throw new Error(message);
}

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // ErrorBoundary calls console.error in componentDidCatch.
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <div>healthy</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("renders the fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom message="oh no" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText(/oh no/)).toBeInTheDocument();
  });

  it("offers a reload action", async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Reload/ }));
    expect(reloadMock).toHaveBeenCalledOnce();
  });
});
