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

  it("adds a new tag via the inline editor", async () => {
    const user = userEvent.setup();
    // Session 1002 has tags=[] in the seed (index 2), so the input is empty.
    renderWithProviders(
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>,
      { routerProps: { initialEntries: [`/sessions/1002`] } },
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-tag-input")).toBeInTheDocument();
    });
    await user.type(screen.getByTestId("session-tag-input"), "regression");
    await user.click(screen.getByTestId("session-tag-add"));

    await waitFor(() => {
      const chips = screen.getAllByTestId("session-tag-chip");
      expect(chips.some((c) => c.textContent?.includes("regression"))).toBe(
        true,
      );
    });
  });

  it("removes a tag via the chip's X button", async () => {
    const user = userEvent.setup();
    // Session 1000 has tags=["checkout", "bug"] in the seed.
    renderAt(1000);
    await waitFor(() => {
      expect(
        screen.getAllByTestId("session-tag-chip").length,
      ).toBeGreaterThanOrEqual(1);
    });

    const checkoutChip = screen
      .getAllByTestId("session-tag-chip")
      .find((c) => c.textContent?.includes("checkout"));
    expect(checkoutChip).toBeDefined();

    const removeBtn = checkoutChip!.querySelector("button");
    expect(removeBtn).not.toBeNull();
    await user.click(removeBtn as HTMLButtonElement);

    await waitFor(() => {
      const remaining = screen.getAllByTestId("session-tag-chip");
      expect(remaining.some((c) => c.textContent?.includes("checkout"))).toBe(
        false,
      );
    });
  });

  it("renders the parsed userAgent badge in the header", async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId("session-user-agent")).toBeInTheDocument();
    });
    expect(screen.getByTestId("session-user-agent")).toHaveTextContent(
      /Chrome · macOS|Safari · iOS|Firefox · Linux|Edge · Windows|Chrome · Android/,
    );
  });

  it("switches between overview, replay, timeline, network and raw tabs", async () => {
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

    await user.click(screen.getByRole("tab", { name: /Network/ }));
    await waitFor(() => {
      expect(screen.getByTestId("session-network-table")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /Raw JSON/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    });
  });

  it("renders the playback speed picker on the Replay tab", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("2"); // jump to Replay
    await waitFor(() => {
      expect(screen.getByTestId("replay-speed-picker")).toBeInTheDocument();
    });

    // 1x is the default and should be the active button.
    const oneX = screen.getByTestId("replay-speed-1");
    expect(oneX.getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByTestId("replay-speed-2"));
    expect(screen.getByTestId("replay-speed-2").getAttribute("aria-pressed")).toBe(
      "true",
    );
    // Choice persists for future visits.
    expect(localStorage.getItem("replay-prefs:v1")).toContain('"speed":2');
  });

  it("renders the Restart button on the Replay tab", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("2");
    await waitFor(() => {
      expect(screen.getByTestId("replay-restart")).toBeInTheDocument();
    });

    // Click is a no-op against the mocked player but should not throw.
    await user.click(screen.getByTestId("replay-restart"));
  });

  it("toggles skip-inactive and persists the choice", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("2");
    await waitFor(() => {
      expect(screen.getByTestId("replay-skip-inactive")).toBeInTheDocument();
    });

    const toggle = screen.getByTestId("replay-skip-inactive");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("replay-prefs:v1")).toContain(
      '"skipInactive":true',
    );
  });

  it("multi-selects timeline type filters", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("3");
    await waitFor(() => {
      expect(screen.getByText(/All types/)).toBeInTheDocument();
    });

    // Desktop list row "All types" should be the active default.
    const allRow = screen
      .getAllByRole("button", { name: /All types/i })
      .find((b) => b.textContent?.includes("All types"));
    expect(allRow).toBeDefined();

    // Pick the first specific-type row in the desktop list (skip "All types").
    const typeRows = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.textContent !== null &&
          /^(Meta|Snapshot|Mutation|Interaction|DomContentLoaded|Load|Custom|Plugin|Type-)/.test(
            b.textContent ?? "",
          ),
      );
    expect(typeRows.length).toBeGreaterThan(0);

    await user.click(typeRows[0]);
    // After selection, a "Clear" affordance appears.
    expect(await screen.findByText(/^Clear$/)).toBeInTheDocument();

    // Toggling the same row again deselects it; "Clear" disappears.
    await user.click(typeRows[0]);
    await waitFor(() => {
      expect(screen.queryByText(/^Clear$/)).not.toBeInTheDocument();
    });
  });

  it("switches tabs via 1/2/3/4 number keys", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Overview/ })).toBeInTheDocument();
    });

    await user.keyboard("2");
    await waitFor(() => {
      expect(screen.getByTestId("replay-mock")).toBeInTheDocument();
    });

    await user.keyboard("3");
    await waitFor(() => {
      expect(screen.getByText(/All types/)).toBeInTheDocument();
    });

    await user.keyboard("4");
    await waitFor(() => {
      expect(
        screen.getByTestId("session-network-table"),
      ).toBeInTheDocument();
    });

    await user.keyboard("5");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
    });

    await user.keyboard("1");
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /Overview/, selected: true }),
      ).toBeInTheDocument();
    });
  });
});
