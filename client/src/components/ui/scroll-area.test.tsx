import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScrollArea } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders its children", () => {
    render(
      <ScrollArea>
        <div>scrollable content</div>
      </ScrollArea>,
    );
    expect(screen.getByText("scrollable content")).toBeInTheDocument();
  });
});
