import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toast, Toaster } from "./toaster";

describe("Toaster + toast", () => {
  it("displays a toast emitted via the imperative API", async () => {
    render(<Toaster />);
    toast.success("hello world", { description: "Body" });
    await waitFor(() => {
      expect(screen.getByText("hello world")).toBeInTheDocument();
    });
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders multiple toasts in order", async () => {
    render(<Toaster />);
    toast("first");
    toast("second");
    await waitFor(() => {
      expect(screen.getByText("first")).toBeInTheDocument();
      expect(screen.getByText("second")).toBeInTheDocument();
    });
  });
});
