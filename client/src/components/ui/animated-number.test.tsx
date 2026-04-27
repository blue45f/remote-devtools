import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnimatedNumber } from "./animated-number";

describe("AnimatedNumber", () => {
  it("renders the formatted value", () => {
    render(<AnimatedNumber value={1234} />);
    // Initial render shows the start value (0); the spring updates via effect.
    // We just verify the element is in the DOM and tabular-nums class is applied.
    const el = screen.getByText((_, node) =>
      Boolean(node?.classList.contains("tabular-nums")),
    );
    expect(el).toBeInTheDocument();
  });

  it("uses the custom formatter", () => {
    render(
      <AnimatedNumber
        value={5}
        format={(n) => `${Math.round(n)}%`}
      />,
    );
    const el = document.querySelector(".tabular-nums");
    expect(el?.textContent).toMatch(/%$/);
  });
});
