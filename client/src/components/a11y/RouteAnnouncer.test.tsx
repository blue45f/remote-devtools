import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteAnnouncer } from './RouteAnnouncer';

// Run rAF callbacks synchronously so the announcer's deferred read/focus/scroll
// happens within the test tick.
beforeEach(() => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Harness() {
  const navigate = useNavigate();
  return (
    <>
      <RouteAnnouncer />
      <button onClick={() => navigate('/sessions')}>go</button>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<h1>home</h1>} />
          <Route path="/sessions" element={<h1>sessions</h1>} />
        </Routes>
      </main>
    </>
  );
}

describe('RouteAnnouncer', () => {
  it('exposes a polite status live region', () => {
    render(
      <MemoryRouter>
        <RouteAnnouncer />
      </MemoryRouter>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveClass('sr-only');
  });

  it('announces the page title and focuses #main-content after navigation', async () => {
    document.title = 'Sessions · Remote DevTools';
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );

    // First render is intentionally silent (a directly-opened URL).
    expect(screen.getByRole('status')).toHaveTextContent('');

    act(() => {
      screen.getByText('go').click();
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Sessions · Remote DevTools/);
    });
    expect(document.getElementById('main-content')).toHaveFocus();
    expect(globalThis.scrollTo).toHaveBeenCalled();
  });
});
