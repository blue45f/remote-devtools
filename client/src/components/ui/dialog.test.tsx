import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function Demo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button>Open</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogHeader>
        body
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens when the trigger is activated", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.queryByText("Title")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => {
      expect(screen.getByText("Title")).toBeInTheDocument();
    });
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("closes via the built-in Close button", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByText("Title");
    await user.click(screen.getByRole("button", { name: /Close/ }));
    await waitFor(() => {
      expect(screen.queryByText("Title")).not.toBeInTheDocument();
    });
  });
});
