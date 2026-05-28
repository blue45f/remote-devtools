import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/utils';

import SessionDetail from './SessionDetail';

// Mock rrweb-player import — its DOM attach behaviour is not the subject under test.
vi.mock('@/components/replay/ReplayPlayer', () => ({
  ReplayPlayer: ({ events }: { events: unknown[] }) => (
    <div data-testid="replay-mock">replay · {events.length} events</div>
  ),
}));

beforeEach(() => {
  localStorage.setItem('demo-mode', '1');
});

function renderAt(id: number) {
  return renderWithProviders(
    <Routes>
      <Route path="/sessions/:id" element={<SessionDetail />} />
    </Routes>,
    { routerProps: { initialEntries: [`/sessions/${id}`] } },
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{`${location.pathname}${location.search}`}</output>;
}

function renderAtWithLocation(id: number) {
  return renderWithProviders(
    <>
      <LocationProbe />
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>
    </>,
    { routerProps: { initialEntries: [`/sessions/${id}`] } },
  );
}

describe('SessionDetail page', () => {
  it('loads metadata for the route param session', async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });
    expect(screen.getByText(/https:\/\/shop\.example\.com\/cart\/checkout/)).toBeInTheDocument();
  });

  it('adds a new tag via the inline editor', async () => {
    const user = userEvent.setup();
    // Session 1002 has tags=[] in the seed (index 2), so the input is empty.
    renderWithProviders(
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>,
      { routerProps: { initialEntries: [`/sessions/1002`] } },
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-tag-input')).toBeInTheDocument();
    });
    await user.type(screen.getByTestId('session-tag-input'), 'regression');
    await user.click(screen.getByTestId('session-tag-add'));

    await waitFor(() => {
      const chips = screen.getAllByTestId('session-tag-chip');
      expect(chips.some((c) => c.textContent?.includes('regression'))).toBe(true);
    });
  });

  it("removes a tag via the chip's X button", async () => {
    const user = userEvent.setup();
    // Session 1000 has tags=["checkout", "bug"] in the seed.
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getAllByTestId('session-tag-chip').length).toBeGreaterThanOrEqual(1);
    });

    const checkoutChip = screen
      .getAllByTestId('session-tag-chip')
      .find((c) => c.textContent?.includes('checkout'));
    expect(checkoutChip).toBeDefined();

    const removeBtn = checkoutChip!.querySelector('button');
    expect(removeBtn).not.toBeNull();
    await user.click(removeBtn as HTMLButtonElement);

    await waitFor(() => {
      const remaining = screen.getAllByTestId('session-tag-chip');
      expect(remaining.some((c) => c.textContent?.includes('checkout'))).toBe(false);
    });
  });

  it('filters the Network tab by resource type chip', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-network-type-strip')).toBeInTheDocument();

    const before = screen.getAllByTestId('session-network-row').length;
    // The seed has multiple Fetch rows + a couple other types — clicking
    // the Fetch chip narrows the list to just Fetch rows.
    const fetchChip = screen.getByTestId('session-network-type-Fetch');
    await user.click(fetchChip);

    await waitFor(() => {
      const after = screen.getAllByTestId('session-network-row').length;
      expect(after).toBeLessThan(before);
      expect(after).toBeGreaterThan(0);
    });
  });

  it('exports filtered Console rows as a text file', async () => {
    const user = userEvent.setup();

    const createObjectURL = vi.fn().mockReturnValue('blob:txt');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    renderAt(1000);

    await user.keyboard('5'); // Console tab
    await waitFor(() => {
      expect(screen.getByTestId('session-console-list')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('session-console-export'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/plain');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('renders the seeded session note and saves an edit', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    const textarea = await screen.findByTestId('session-note-input');
    // Session 1000 ships with a seeded note.
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toMatch(/Repro:/);
    });

    // No Save button until the draft diverges from the saved note.
    expect(screen.queryByTestId('session-note-save')).not.toBeInTheDocument();

    await user.clear(textarea);
    await user.type(textarea, 'Updated note body');
    expect(screen.getByTestId('session-note-save')).toBeInTheDocument();

    await user.click(screen.getByTestId('session-note-save'));

    // After the demo PATCH round-trips, the cache updates and the Save
    // button disappears (draft === saved).
    await waitFor(() => {
      expect(screen.queryByTestId('session-note-save')).not.toBeInTheDocument();
    });
  });

  it('opens the keyboard shortcuts overlay when ? is pressed', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('?');

    await waitFor(() => {
      expect(screen.getByTestId('session-shortcuts-help')).toBeInTheDocument();
    });
    // Should list the tab shortcuts as <kbd> chips.
    const dialog = screen.getByTestId('session-shortcuts-help');
    expect(dialog).toHaveTextContent('Overview tab');
    expect(dialog).toHaveTextContent('Replay tab');
    expect(dialog).toHaveTextContent('Jump to Replay and focus a new comment');
  });

  it('shows the Network summary bar with transferred bytes and failed count', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const summary = screen.getByTestId('session-network-summary');
    expect(summary).toHaveTextContent(/transferred/);
    // Seed has one 401 and one 500 → at least one failed request.
    expect(screen.getByTestId('session-network-failed')).toHaveTextContent(/failed/);
  });

  it('sorts the Network table by size when the Size header is clicked', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const sizeText = () =>
      screen
        .getAllByTestId('session-network-row')
        .map((row) => row.querySelector('td:nth-child(5)')?.textContent ?? '');

    const before = sizeText();
    // Click once → descending by size. The first row's size should be >=
    // every other parseable size.
    await user.click(screen.getByTestId('session-network-sort-size'));

    await waitFor(() => {
      const after = sizeText();
      expect(after).not.toEqual(before);
    });
  });

  it('filters the Network tab by HTTP status class chip', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-network-status-strip')).toBeInTheDocument();

    const before = screen.getAllByTestId('session-network-row').length;
    // Seed has exactly one 4xx (401) row.
    const fourChip = screen.getByTestId('session-network-status-4xx');
    await user.click(fourChip);

    await waitFor(() => {
      const after = screen.getAllByTestId('session-network-row').length;
      expect(after).toBe(1);
      expect(after).toBeLessThan(before);
    });
  });

  it('triggers a HAR download from the Network tab', async () => {
    const user = userEvent.setup();

    // Stub URL.createObjectURL / revokeObjectURL so the click handler
    // doesn't blow up in jsdom.
    const createObjectURL = vi.fn().mockReturnValue('blob:fake');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-har')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('session-network-har'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('renders seeded replay comments on the Replay tab', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('2'); // jump to Replay
    await waitFor(() => {
      expect(screen.getByTestId('replay-comments-panel')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
  });

  it('jumps to the Replay tab when a Network row jump button is clicked', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('4'); // Network tab
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const jumpButtons = screen.getAllByTestId('session-network-jump');
    expect(jumpButtons.length).toBeGreaterThan(0);
    await user.click(jumpButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Replay/, selected: true })).toBeInTheDocument();
    });
  });

  it('jumps to the Replay tab when a Console row jump button is clicked', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('5'); // Console tab
    await waitFor(() => {
      expect(screen.getByTestId('session-console-list')).toBeInTheDocument();
    });

    const jumpButtons = screen.getAllByTestId('session-console-jump');
    expect(jumpButtons.length).toBeGreaterThan(0);
    await user.click(jumpButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Replay/, selected: true })).toBeInTheDocument();
    });
  });

  it('renders comment markers on the Replay minimap', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getByTestId('replay-minimap')).toBeInTheDocument();
    });
    // Seed router pre-seeds 2 starter comments per session.
    const markers = screen.getAllByTestId('replay-minimap-comment');
    expect(markers.length).toBeGreaterThanOrEqual(2);
  });

  it('edits a comment inline and the new body persists', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });

    const bodyButton = screen.getAllByTestId('replay-comment-body')[0];
    const originalText = bodyButton.textContent ?? '';
    expect(originalText).not.toBe('');

    await user.click(bodyButton);
    const input = await screen.findByTestId('replay-comment-edit-input');
    await user.clear(input);
    await user.type(input, 'rewritten note about a regression{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/rewritten note about a regression/)).toBeInTheDocument();
    });
    // The edit input should be gone after commit.
    expect(screen.queryByTestId('replay-comment-edit-input')).not.toBeInTheDocument();
  });

  it('Escape cancels an in-progress comment edit', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });

    const bodyButton = screen.getAllByTestId('replay-comment-body')[0];
    const originalText = bodyButton.textContent ?? '';

    await user.click(bodyButton);
    const input = await screen.findByTestId('replay-comment-edit-input');
    await user.clear(input);
    await user.type(input, 'this should be discarded{Escape}');

    await waitFor(() => {
      expect(screen.queryByTestId('replay-comment-edit-input')).not.toBeInTheDocument();
    });
    // Original text restored.
    expect(screen.getAllByTestId('replay-comment-body')[0].textContent).toBe(originalText);
  });

  it('adds a new comment and the chip count increments', async () => {
    const user = userEvent.setup();
    renderAt(1001);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getByTestId('replay-comment-input')).toBeInTheDocument();
    });
    // Wait for the seeded comments to land so the increment is meaningful.
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
    const before = screen.getAllByTestId('replay-comment').length;

    await user.type(
      screen.getByTestId('replay-comment-input'),
      'regression on the empty cart flow',
    );
    await user.click(screen.getByTestId('replay-comment-add'));

    await waitFor(() => {
      const after = screen.getAllByTestId('replay-comment').length;
      expect(after).toBe(before + 1);
    });
    expect(screen.getByText(/regression on the empty cart flow/)).toBeInTheDocument();
  });

  it('opens a response body dialog when a Network row is clicked', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('session-network-row');
    expect(rows.length).toBeGreaterThan(0);
    await user.click(rows[2]); // seed row #2 is the POST /cart/items with a body

    await waitFor(() => {
      expect(screen.getByTestId('session-network-detail')).toBeInTheDocument();
    });
    const body = screen.getByTestId('session-network-body');
    // Pretty-printed JSON gets newlines + indent.
    expect(body.textContent).toContain('"ok": true');
  });

  it('copies URL and cURL from the network detail dialog', async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('session-network-row');
    await user.click(rows[2]);
    await waitFor(() => {
      expect(screen.getByTestId('session-network-detail')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('session-network-detail-copy-url'));
    expect(writeText.mock.calls.at(-1)?.[0]).toMatch(/^https?:\/\//);

    await user.click(screen.getByTestId('session-network-detail-copy-curl'));
    expect(writeText.mock.calls.at(-1)?.[0]).toMatch(/^curl /);
  });

  it('downloads the response body from the detail dialog', async () => {
    const user = userEvent.setup();

    const createObjectURL = vi.fn().mockReturnValue('blob:dl');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const rows = screen.getAllByTestId('session-network-row');
    await user.click(rows[2]);

    await waitFor(() => {
      expect(screen.getByTestId('session-network-detail')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('session-network-body-download'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('json');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('copies the session URL via the header Copy URL button', async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    const btn = await screen.findByTestId('session-header-copy-url');
    await user.click(btn);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/^https?:\/\//);
  });

  it('copies a Network row URL via the Copy URL button', async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId('session-network-copy-url');
    expect(buttons.length).toBeGreaterThan(0);
    await user.click(buttons[0]);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/^https?:\/\//);
  });

  it('exposes a Copy cURL button on Network rows', async () => {
    const user = userEvent.setup();

    // Mock clipboard for jsdom — userEvent.setup() in this project doesn't
    // configure one automatically, and `navigator.clipboard` is a getter
    // so plain Object.assign won't take.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    await user.keyboard('4'); // Network tab
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId('session-network-curl');
    expect(buttons.length).toBeGreaterThan(0);
    await user.click(buttons[0]);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/^curl /);
  });

  it('jumps from a Network row to the matching replay offset', async () => {
    const user = userEvent.setup();
    renderAtWithLocation(1000);

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    const jumpButtons = screen.getAllByTestId('session-network-jump');
    expect(jumpButtons.length).toBeGreaterThan(1);
    await user.click(jumpButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Replay/, selected: true })).toBeInTheDocument();
    });
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/sessions/1000?t=1200');
  });

  it('renders the parsed userAgent badge in the header', async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId('session-user-agent')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-user-agent')).toHaveTextContent(
      /Chrome · macOS|Safari · iOS|Firefox · Linux|Edge · Windows|Chrome · Android/,
    );
  });

  it('surfaces a comment count badge on the Replay tab', async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId('replay-comments-badge')).toBeInTheDocument();
    });
    // Seed router pre-seeds 2 starter comments per session.
    expect(screen.getByTestId('replay-comments-badge').textContent).toBe('2');
  });

  it('C jumps to Replay and focuses the comment input', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /Overview/, selected: true })).toBeInTheDocument();

    await user.keyboard('c');

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Replay/, selected: true })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('replay-comment-input'));
    });
  });

  it('surfaces error count badges on Network and Console tabs', async () => {
    renderAt(1000);

    // The Network tab badge picks up the 401 + 500 from the seed fixture.
    await waitFor(() => {
      expect(screen.getByTestId('network-error-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('network-error-badge').textContent).toBe('2');

    // The Console tab badge picks up the two error-level entries in the
    // seed fixture (TypeError + 500 Internal Server Error).
    await waitFor(() => {
      expect(screen.getByTestId('console-error-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('console-error-badge').textContent).toBe('2');
  });

  it('surfaces a top-errors card on the Overview tab when console errors exist', async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId('overview-top-errors')).toBeInTheDocument();
    });
    // Seed has 2 error-level console rows.
    const rows = screen.getAllByTestId('overview-top-error-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('Top errors "See all" jumps to the Console tab', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId('overview-top-errors-jump')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('overview-top-errors-jump'));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Console/, selected: true })).toBeInTheDocument();
    });
  });

  it('renders captured console messages on the Console tab', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('5'); // Console
    await waitFor(() => {
      expect(screen.getByTestId('session-console-list')).toBeInTheDocument();
    });
    const rows = screen.getAllByTestId('session-console-row');
    expect(rows.length).toBeGreaterThan(0);
    // Error and warn levels exist in the seed fixture.
    expect(rows.some((r) => r.getAttribute('data-level') === 'error')).toBe(true);
    expect(rows.some((r) => r.getAttribute('data-level') === 'warn')).toBe(true);
  });

  it('jumps from a Console row to the matching replay offset', async () => {
    const user = userEvent.setup();
    renderAtWithLocation(1000);

    await user.keyboard('5');
    await waitFor(() => {
      expect(screen.getByTestId('session-console-list')).toBeInTheDocument();
    });

    const jumpButtons = screen.getAllByTestId('session-console-jump');
    expect(jumpButtons.length).toBeGreaterThan(2);
    await user.click(jumpButtons[2]);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Replay/, selected: true })).toBeInTheDocument();
    });
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/sessions/1000?t=1800');
  });

  it('filters Console rows by level chip', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('5');
    await waitFor(() => {
      expect(screen.getByTestId('console-level-chip-error')).toBeInTheDocument();
    });

    const before = screen.getAllByTestId('session-console-row').length;
    await user.click(screen.getByTestId('console-level-chip-error'));

    await waitFor(() => {
      const rows = screen.getAllByTestId('session-console-row');
      expect(rows.length).toBeLessThan(before);
      expect(rows.every((r) => r.getAttribute('data-level') === 'error')).toBe(true);
    });
  });

  it('switches between overview, replay, timeline, network and raw tabs', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Replay/ }));
    await waitFor(() => {
      expect(screen.getByTestId('replay-mock')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Timeline/ }));
    await waitFor(() => {
      expect(screen.getByText(/All types/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Network/ }));
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Raw JSON/ }));
    await waitFor(() => {
      expect(screen.getByTestId('raw-copy')).toBeInTheDocument();
    });
  });

  it('renders the playback speed picker on the Replay tab', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('2'); // jump to Replay
    await waitFor(() => {
      expect(screen.getByTestId('replay-speed-picker')).toBeInTheDocument();
    });

    // 1x is the default and should be the active button.
    const oneX = screen.getByTestId('replay-speed-1');
    expect(oneX.getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getByTestId('replay-speed-2'));
    expect(screen.getByTestId('replay-speed-2').getAttribute('aria-pressed')).toBe('true');
    // Choice persists for future visits.
    expect(localStorage.getItem('replay-prefs:v1')).toContain('"speed":2');
  });

  it('renders the Restart button on the Replay tab', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getByTestId('replay-restart')).toBeInTheDocument();
    });

    // Click is a no-op against the mocked player but should not throw.
    await user.click(screen.getByTestId('replay-restart'));
  });

  it('toggles skip-inactive and persists the choice', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getByTestId('replay-skip-inactive')).toBeInTheDocument();
    });

    const toggle = screen.getByTestId('replay-skip-inactive');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('replay-prefs:v1')).toContain('"skipInactive":true');
  });

  it('multi-selects timeline type filters', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('3');
    await waitFor(() => {
      expect(screen.getByText(/All types/)).toBeInTheDocument();
    });

    // Desktop list row "All types" should be the active default.
    const allRow = screen
      .getAllByRole('button', { name: /All types/i })
      .find((b) => b.textContent?.includes('All types'));
    expect(allRow).toBeDefined();

    // Pick the first specific-type row in the desktop list (skip "All types").
    const typeRows = screen
      .getAllByRole('button')
      .filter(
        (b) =>
          b.textContent !== null &&
          /^(Meta|Snapshot|Mutation|Interaction|DomContentLoaded|Load|Custom|Plugin|Type-)/.test(
            b.textContent ?? '',
          ),
      );
    expect(typeRows.length).toBeGreaterThan(0);

    await user.click(typeRows[0]);
    // After selection, a "Clear" affordance appears.
    expect(await screen.findByText(/^Clear$/)).toBeInTheDocument();

    // Toggling the same row again deselects it; "Clear" disappears.
    await user.click(typeRows[0]);
    await waitFor(() => {
      expect(screen.queryByText(/^Clear$/)).not.toBeInTheDocument();
    });
  });

  it('switches tabs via 1/2/3/4 number keys', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
    });

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getByTestId('replay-mock')).toBeInTheDocument();
    });

    await user.keyboard('3');
    await waitFor(() => {
      expect(screen.getByText(/All types/)).toBeInTheDocument();
    });

    await user.keyboard('4');
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    await user.keyboard('5');
    await waitFor(() => {
      expect(screen.getByTestId('session-console-list')).toBeInTheDocument();
    });

    await user.keyboard('6');
    await waitFor(() => {
      expect(screen.getByTestId('raw-copy')).toBeInTheDocument();
    });

    await user.keyboard('1');
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Overview/, selected: true })).toBeInTheDocument();
    });
  });
});
