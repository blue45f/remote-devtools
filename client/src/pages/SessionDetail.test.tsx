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

  it("triggers a HAR download from the Network tab", async () => {
    const user = userEvent.setup();

    // Stub URL.createObjectURL / revokeObjectURL so the click handler
    // doesn't blow up in jsdom.
    const createObjectURL = vi.fn().mockReturnValue("blob:fake");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    renderAt(1000);

    await user.keyboard("4");
    await waitFor(() => {
      expect(screen.getByTestId("session-network-har")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("session-network-har"));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/json");
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("renders seeded replay comments on the Replay tab", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("2"); // jump to Replay
    await waitFor(() => {
      expect(screen.getByTestId("replay-comments-panel")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByTestId("replay-comment").length).toBeGreaterThan(0);
    });
  });

  it("adds a new comment and the chip count increments", async () => {
    const user = userEvent.setup();
    renderAt(1001);

    await user.keyboard("2");
    await waitFor(() => {
      expect(screen.getByTestId("replay-comment-input")).toBeInTheDocument();
    });
    // Wait for the seeded comments to land so the increment is meaningful.
    await waitFor(() => {
      expect(screen.getAllByTestId("replay-comment").length).toBeGreaterThan(0);
    });
    const before = screen.getAllByTestId("replay-comment").length;

    await user.type(
      screen.getByTestId("replay-comment-input"),
      "regression on the empty cart flow",
    );
    await user.click(screen.getByTestId("replay-comment-add"));

    await waitFor(() => {
      const after = screen.getAllByTestId("replay-comment").length;
      expect(after).toBe(before + 1);
    });
    expect(
      screen.getByText(/regression on the empty cart flow/),
    ).toBeInTheDocument();
  });

  it("opens a response body dialog when a Network row is clicked", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("4");
    await waitFor(() => {
      expect(
        screen.getByTestId("session-network-table"),
      ).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId("session-network-row");
    expect(rows.length).toBeGreaterThan(0);
    await user.click(rows[2]); // seed row #2 is the POST /cart/items with a body

    await waitFor(() => {
      expect(screen.getByTestId("session-network-detail")).toBeInTheDocument();
    });
    const body = screen.getByTestId("session-network-body");
    // Pretty-printed JSON gets newlines + indent.
    expect(body.textContent).toContain('"ok": true');
  });

  it("exposes a Copy cURL button on Network rows", async () => {
    const user = userEvent.setup();

    // Mock clipboard for jsdom — userEvent.setup() in this project doesn't
    // configure one automatically, and `navigator.clipboard` is a getter
    // so plain Object.assign won't take.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    await user.keyboard("4"); // Network tab
    await waitFor(() => {
      expect(
        screen.getByTestId("session-network-table"),
      ).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("session-network-curl");
    expect(buttons.length).toBeGreaterThan(0);
    await user.click(buttons[0]);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/^curl /);
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

  it("surfaces error count badges on Network and Console tabs", async () => {
    renderAt(1000);

    // The Network tab badge picks up the 401 + 500 from the seed fixture.
    await waitFor(() => {
      expect(screen.getByTestId("network-error-badge")).toBeInTheDocument();
    });
    expect(screen.getByTestId("network-error-badge").textContent).toBe("2");

    // The Console tab badge picks up the two error-level entries in the
    // seed fixture (TypeError + 500 Internal Server Error).
    await waitFor(() => {
      expect(screen.getByTestId("console-error-badge")).toBeInTheDocument();
    });
    expect(screen.getByTestId("console-error-badge").textContent).toBe("2");
  });

  it("renders captured console messages on the Console tab", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("5"); // Console
    await waitFor(() => {
      expect(screen.getByTestId("session-console-list")).toBeInTheDocument();
    });
    const rows = screen.getAllByTestId("session-console-row");
    expect(rows.length).toBeGreaterThan(0);
    // Error and warn levels exist in the seed fixture.
    expect(
      rows.some((r) => r.getAttribute("data-level") === "error"),
    ).toBe(true);
    expect(
      rows.some((r) => r.getAttribute("data-level") === "warn"),
    ).toBe(true);
  });

  it("filters Console rows by level chip", async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard("5");
    await waitFor(() => {
      expect(screen.getByTestId("console-level-chip-error")).toBeInTheDocument();
    });

    const before = screen.getAllByTestId("session-console-row").length;
    await user.click(screen.getByTestId("console-level-chip-error"));

    await waitFor(() => {
      const rows = screen.getAllByTestId("session-console-row");
      expect(rows.length).toBeLessThan(before);
      expect(
        rows.every((r) => r.getAttribute("data-level") === "error"),
      ).toBe(true);
    });
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
      expect(screen.getByTestId("session-console-list")).toBeInTheDocument();
    });

    await user.keyboard("6");
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
