import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createDebuggerMock = vi.fn();
vi.mock("remote-debug-sdk", () => ({
  createDebugger: createDebuggerMock,
}));

import SdkModule from "./SdkModule";
import SdkScript from "./SdkScript";

beforeEach(() => {
  createDebuggerMock.mockClear();
  document.head
    .querySelectorAll('script[src*="sdk/index.umd.js"]')
    .forEach((s) => s.remove());
});

afterEach(() => {
  document.head
    .querySelectorAll('script[src*="sdk/index.umd.js"]')
    .forEach((s) => s.remove());
});

describe("SdkModule page", () => {
  it("renders the module SDK badge", () => {
    render(<SdkModule />);
    expect(screen.getByText("Module SDK")).toBeInTheDocument();
  });
});

describe("SdkScript page", () => {
  it("renders the script SDK badge and injects the UMD script", () => {
    render(<SdkScript />);
    expect(screen.getByText(/Script SDK \(UMD\)/)).toBeInTheDocument();
    expect(
      document.head.querySelector('script[src*="sdk/index.umd.js"]'),
    ).not.toBeNull();
  });
});
