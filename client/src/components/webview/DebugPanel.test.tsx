import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DebugPanel from "./DebugPanel";

function makeProps() {
  return {
    domNodes: [],
    onDomChange: vi.fn(),
    onConsoleLog: vi.fn(),
    onToggleLoading: vi.fn(),
    onFetchRequest: vi.fn(),
    onXhrRequest: vi.fn(),
    onAxiosRequest: vi.fn(),
    onPostRequest: vi.fn(),
    onPutRequest: vi.fn(),
    onPatchRequest: vi.fn(),
    onDeleteRequest: vi.fn(),
  };
}

describe("DebugPanel", () => {
  it("groups requests by method semantics", () => {
    render(<DebugPanel {...makeProps()} />);
    expect(screen.getByText("Read requests")).toBeInTheDocument();
    expect(screen.getByText("Mutation requests")).toBeInTheDocument();
    expect(screen.getByText("DOM & Console")).toBeInTheDocument();
  });

  it("invokes the right handler for each button", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<DebugPanel {...props} />);

    await user.click(screen.getByRole("button", { name: /Fetch API/ }));
    expect(props.onFetchRequest).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /XMLHttpRequest/ }));
    expect(props.onXhrRequest).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /Axios/ }));
    expect(props.onAxiosRequest).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /^POST$/ }));
    expect(props.onPostRequest).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /^DELETE$/ }));
    expect(props.onDeleteRequest).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /Add DOM node/ }));
    expect(props.onDomChange).toHaveBeenCalledOnce();
  });

  it("renders a captured-DOM panel when nodes exist", () => {
    render(<DebugPanel {...makeProps()} domNodes={["가", "나"]} />);
    expect(screen.getByText(/Captured DOM nodes/)).toBeInTheDocument();
    expect(screen.getByText("가")).toBeInTheDocument();
    expect(screen.getByText("나")).toBeInTheDocument();
  });

  it("hides the captured-DOM panel when there are no nodes", () => {
    render(<DebugPanel {...makeProps()} domNodes={[]} />);
    expect(screen.queryByText(/Captured DOM nodes/)).not.toBeInTheDocument();
  });
});
