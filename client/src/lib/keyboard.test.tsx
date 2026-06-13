import { render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useGlobalShortcuts } from './keyboard';
import { useAppStore } from './store';

function Probe() {
  useGlobalShortcuts();
  const location = useLocation();
  return <div data-testid="probe">{location.pathname}</div>;
}

function renderProbe() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAppStore.setState({ commandOpen: false, shortcutsOpen: false });
});

afterEach(() => {
  useAppStore.setState({ commandOpen: false, shortcutsOpen: false });
});

describe('useGlobalShortcuts', () => {
  it('opens the command palette on cmd/ctrl+k', async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(useAppStore.getState().commandOpen).toBe(true);
  });

  it('navigates with the g+letter chord', async () => {
    const user = userEvent.setup();
    const { getByTestId } = renderProbe();

    expect(getByTestId('probe').textContent).toBe('/dashboard');

    await act(async () => {
      await user.keyboard('gs');
    });
    expect(getByTestId('probe').textContent).toBe('/sessions');

    await act(async () => {
      await user.keyboard('gd');
    });
    expect(getByTestId('probe').textContent).toBe('/dashboard');

    await act(async () => {
      await user.keyboard('gm');
    });
    expect(getByTestId('probe').textContent).toBe('/sandbox/module');

    await act(async () => {
      await user.keyboard('gp');
    });
    expect(getByTestId('probe').textContent).toBe('/sandbox/script');
  });

  it('toggles the shortcuts dialog on `?`', async () => {
    const user = userEvent.setup();
    renderProbe();

    expect(useAppStore.getState().shortcutsOpen).toBe(false);

    // userEvent emits `?` as Shift+/; the handler matches on `e.key === "?"`.
    await user.keyboard('?');
    expect(useAppStore.getState().shortcutsOpen).toBe(true);

    await user.keyboard('?');
    expect(useAppStore.getState().shortcutsOpen).toBe(false);
  });

  it('toggles the sidebar collapsed state on `[`', async () => {
    const user = userEvent.setup();
    renderProbe();

    // `[` is the leading char of user-event's key-code syntax; double it
    // to type a literal bracket.
    const initial = useAppStore.getState().sidebarCollapsed;
    await user.keyboard('[[');
    expect(useAppStore.getState().sidebarCollapsed).toBe(!initial);
    await user.keyboard('[[');
    expect(useAppStore.getState().sidebarCollapsed).toBe(initial);
  });
});
