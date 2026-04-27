import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

describe("Select", () => {
  it("opens, lists options, and emits onValueChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select onValueChange={onChange}>
        <SelectTrigger aria-label="Pick">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Apple</SelectItem>
          <SelectItem value="b">Banana</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByText("Choose")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Pick" }));
    await waitFor(() => {
      expect(screen.getByText("Apple")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Banana"));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
