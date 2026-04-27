import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/utils";

import SessionDetail from "./SessionDetail";

// Mock rrweb-player import — its DOM attach behaviour is not the subject under test.
vi.mock("@/components/replay/ReplayPlayer", () => ({
  ReplayPlayer: ({ events }: { events: unknown[] }) => (
    <div data-testid="replay-mock">replay · {events.length} events</div>
  ),
}));

beforeEach(() => {
  localStorage.setItem("demo-mode", "1");
});

function renderAt(id: number) {
  return renderWithProviders(
    <Routes>
      <Route path="/sessions/:id" element={<SessionDetail />} />
    </Routes>,
    { routerProps: { initialEntries: [`/sessions/${id}`] } },
  );
}

describe("SessionDetail page", () => {
  it("loads metadata for the route param session", async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/https:\/\/shop\.example\.com\/cart\/checkout/),
    ).toBeInTheDocument();
  });

  it("switches between overview, replay, timeline and raw tabs", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Overview/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Replay/ }));
    await waitFor(() => {
      expect(screen.getByTestId("replay-mock")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Timeline/ }));
    await waitFor(() => {
      expect(screen.getByText(/All types/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Raw JSON/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    });
  });
});
