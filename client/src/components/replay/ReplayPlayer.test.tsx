import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const playerCtor = vi.fn();
vi.mock("rrweb-player", () => ({
  default: class {
    constructor(opts: unknown) {
      playerCtor(opts);
    }
    $destroy = vi.fn();
  },
}));
vi.mock("rrweb-player/dist/style.css", () => ({}));

import { ReplayPlayer } from "./ReplayPlayer";

const validEvents = [
  { type: 4, timestamp: 0, data: { href: "x", width: 1, height: 1 } },
  {
    type: 2,
    timestamp: 1,
    data: {
      node: {
        type: 0,
        id: 0,
        childNodes: [{ type: 1, name: "html", id: 2 }],
      },
      initialOffset: { left: 0, top: 0 },
    },
  },
];

describe("ReplayPlayer", () => {
  it("blocks replay when there are no events", () => {
    render(<ReplayPlayer events={[]} />);
    expect(screen.getByText(/Replay unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/no events to replay/)).toBeInTheDocument();
  });

  it("blocks replay when the FullSnapshot has no DOM tree", () => {
    render(
      <ReplayPlayer
        events={[
          { type: 4, timestamp: 0, data: {} },
          { type: 2, timestamp: 1, data: {} },
        ]}
      />,
    );
    expect(
      screen.getByText(/FullSnapshot has no DOM tree/),
    ).toBeInTheDocument();
  });

  it("blocks replay when Meta is missing", () => {
    render(
      <ReplayPlayer
        events={[
          { type: 2, timestamp: 0, data: validEvents[1].data },
          { type: 3, timestamp: 1, data: {} },
        ]}
      />,
    );
    expect(screen.getByText(/missing Meta event/)).toBeInTheDocument();
  });

  it("mounts rrweb-player when events are valid", async () => {
    playerCtor.mockClear();
    render(<ReplayPlayer events={validEvents} />);
    await waitFor(() => {
      expect(playerCtor).toHaveBeenCalled();
    });
    const call = playerCtor.mock.calls[0][0] as {
      target: HTMLElement;
      props: { events: unknown[] };
    };
    expect(call.target).toBeInstanceOf(HTMLElement);
    expect(call.props.events).toBe(validEvents);
  });

  it("exposes a stable mount node when valid", () => {
    render(<ReplayPlayer events={validEvents} />);
    expect(screen.getByTestId("rrweb-mount")).toBeInTheDocument();
  });
});
