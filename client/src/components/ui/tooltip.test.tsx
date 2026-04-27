import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

describe("Tooltip", () => {
  it("shows content after the trigger is focused", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Trigger</button>
          </TooltipTrigger>
          <TooltipContent>Tip body</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab(); // focus the trigger
    await waitFor(() => {
      expect(screen.getAllByText("Tip body").length).toBeGreaterThan(0);
    });
  });
});
