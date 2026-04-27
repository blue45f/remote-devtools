import { describe, expect, it } from "vitest";

import { buildDevToolsLink } from "./devtools-link";

describe("buildDevToolsLink", () => {
  it("builds a live (non-record) WebSocket URL with ws protocol", () => {
    const url = buildDevToolsLink(
      "checkout-flow",
      undefined,
      "http://localhost:3000",
    );
    expect(url).toBe(
      "http://localhost:3000/tabbed-debug/?ws=" +
        encodeURIComponent("localhost:3000?room=checkout-flow"),
    );
  });

  it("includes recordMode=true and the recordId for recorded sessions", () => {
    const url = buildDevToolsLink(
      "billing-modal-bug",
      42,
      "http://localhost:3000",
    );
    const decoded = decodeURIComponent(url.split("=").slice(1).join("="));
    expect(decoded).toContain("room=billing-modal-bug");
    expect(decoded).toContain("recordMode=true");
    expect(decoded).toContain("recordId=42");
  });

  it("upgrades to wss when the host is HTTPS", () => {
    const url = buildDevToolsLink(
      "session",
      undefined,
      "https://devtools.example.com",
    );
    expect(url.startsWith("https://devtools.example.com/tabbed-debug/?wss=")).toBe(
      true,
    );
  });

  it("strips the protocol from the embedded host", () => {
    const url = buildDevToolsLink(
      "session",
      undefined,
      "https://devtools.example.com",
    );
    const decoded = decodeURIComponent(url.split("?wss=")[1]);
    expect(decoded.startsWith("devtools.example.com")).toBe(true);
    expect(decoded).not.toContain("https://");
  });

  it("encodes special characters in the room identifier", () => {
    const url = buildDevToolsLink(
      "room with spaces & %",
      undefined,
      "http://localhost:3000",
    );
    expect(url).toContain(
      encodeURIComponent("localhost:3000?room=room with spaces & %"),
    );
  });
});
