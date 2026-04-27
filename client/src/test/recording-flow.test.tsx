/**
 * End-to-end-style integration test for the recording flow as visible from
 * the frontend. Demo mode replaces the real backend with seed responses, so
 * the full chain — list → detail → replay — can be exercised without booting
 * NestJS or Postgres.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/components/replay/ReplayPlayer", () => ({
  ReplayPlayer: ({ events }: { events: unknown[] }) => (
    <div data-testid="replay-mock">replay · {events.length} events</div>
  ),
}));

beforeEach(() => {
  localStorage.setItem("demo-mode", "1");
});

afterEach(() => {
  localStorage.removeItem("demo-mode");
});

describe("Recording flow (demo mode)", () => {
  it("Sessions list → detail → replay end-to-end", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>,
      { routerProps: { initialEntries: ["/sessions"] } },
    );

    // Sessions list populates from demo seed
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    // Pick a recorded session
    const detailLinks = screen.getAllByRole("link", {
      name: /View session details/,
    });
    expect(detailLinks.length).toBeGreaterThan(0);
    await user.click(detailLinks[0]);

    // Navigated to the detail page
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /Replay/ }),
      ).toBeInTheDocument();
    });

    // Switch to Replay tab and verify the player gets seed rrweb events
    await user.click(screen.getByRole("tab", { name: /Replay/ }));
    await waitFor(() => {
      expect(screen.getByTestId("replay-mock")).toBeInTheDocument();
    });
    const text = screen.getByTestId("replay-mock").textContent ?? "";
    const n = Number(text.match(/(\d+) events/)?.[1] ?? 0);
    expect(n).toBeGreaterThan(20);
  });

  it("Live tab shows only non-recorded sessions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);

    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    await waitFor(() => {
      expect(screen.getByText(/live-stream-debug/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/checkout-flow-test/)).not.toBeInTheDocument();
  });
});
