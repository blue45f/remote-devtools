import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "@/lib/store";
import { renderWithProviders } from "@/test/utils";

import { ThemeMenu } from "./ThemeMenu";

beforeEach(() => {
  useAppStore.setState({ theme: "system" });
});

afterEach(() => {
  useAppStore.setState({ theme: "system" });
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeMenu", () => {
  it("opens a menu offering all three themes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeMenu />);
    await user.click(screen.getByRole("button", { name: /Switch theme/ }));
    expect(await screen.findByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("switches the theme via the menu", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeMenu />);
    await user.click(screen.getByRole("button", { name: /Switch theme/ }));
    await user.click(await screen.findByText("Dark"));

    await waitFor(() => {
      expect(useAppStore.getState().theme).toBe("dark");
    });
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
