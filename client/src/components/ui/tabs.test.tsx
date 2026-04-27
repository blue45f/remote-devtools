import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function Demo() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">First</TabsTrigger>
        <TabsTrigger value="b">Second</TabsTrigger>
      </TabsList>
      <TabsContent value="a">panel-a</TabsContent>
      <TabsContent value="b">panel-b</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders the default panel only", () => {
    render(<Demo />);
    expect(screen.getByText("panel-a")).toBeInTheDocument();
    expect(screen.queryByText("panel-b")).not.toBeInTheDocument();
  });

  it("switches panels on tab click", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole("tab", { name: "Second" }));
    expect(screen.queryByText("panel-a")).not.toBeInTheDocument();
    expect(screen.getByText("panel-b")).toBeInTheDocument();
  });

  it("marks the active tab via aria-selected", () => {
    render(<Demo />);
    expect(
      screen.getByRole("tab", { name: "First" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tab", { name: "Second" }),
    ).toHaveAttribute("aria-selected", "false");
  });
});
