import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Separator } from "./separator";

describe("Separator", () => {
  it("renders a horizontal line by default", () => {
    const { container } = render(<Separator />);
    const sep = container.firstElementChild as HTMLElement;
    expect(sep.getAttribute("data-orientation")).toBe("horizontal");
    expect(sep.className).toMatch(/h-px/);
  });

  it("can be vertical", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const sep = container.firstElementChild as HTMLElement;
    expect(sep.getAttribute("data-orientation")).toBe("vertical");
    expect(sep.className).toMatch(/w-px/);
  });
});
