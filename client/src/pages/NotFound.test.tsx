import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import NotFound from "./NotFound";

describe("NotFound", () => {
  it("renders the 404 message and primary actions", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Lost in the network")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /All sessions/ }),
    ).toHaveAttribute("href", "/sessions");
    expect(
      screen.getByRole("link", { name: /Dashboard/ }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
