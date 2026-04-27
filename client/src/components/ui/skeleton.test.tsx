import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders with the shimmer animation class", () => {
    const { container } = render(<Skeleton className="h-4 w-12" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/animate-shimmer/);
    expect(el.className).toMatch(/h-4/);
  });

  it("is hidden from assistive tech", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
