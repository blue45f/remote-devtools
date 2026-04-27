import { render, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { useAppStore } from "./store";
import { useGlobalShortcuts } from "./keyboard";

function Probe() {
  useGlobalShortcuts();
  const location = useLocation();
  return <div data-testid="probe">{location.pathname}</div>;
}

function renderProbe() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAppStore.setState({ commandOpen: false });
});

afterEach(() => {
  useAppStore.setState({ commandOpen: false });
});

describe("useGlobalShortcuts", () => {
  it("opens the command palette on cmd/ctrl+k", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(useAppStore.getState().commandOpen).toBe(true);
  });

  it("navigates with the g+letter chord", async () => {
    const user = userEvent.setup();
    const { getByTestId } = renderProbe();

    expect(getByTestId("probe").textContent).toBe("/dashboard");

    await act(async () => {
      await user.keyboard("gs");
    });
    expect(getByTestId("probe").textContent).toBe("/sessions");

    await act(async () => {
      await user.keyboard("gd");
    });
    expect(getByTestId("probe").textContent).toBe("/dashboard");

    await act(async () => {
      await user.keyboard("gm");
    });
    expect(getByTestId("probe").textContent).toBe("/sandbox/module");

    await act(async () => {
      await user.keyboard("gp");
    });
    expect(getByTestId("probe").textContent).toBe("/sandbox/script");
  });
});
