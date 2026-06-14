import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SessionDetail, { buildSessionInsights } from './SessionDetail';

import { __failNextDemoCommentSave, __resetDemoComments } from '@/lib/seed-router';
import { renderWithProviders } from '@/test/utils';

// Mock rrweb-player import — its DOM attach behaviour is not the subject under test.
vi.mock('@/components/replay/ReplayPlayer', () => ({
  ReplayPlayer: ({ events }: { events: unknown[] }) => (
    <div data-testid="replay-mock">replay · {events.length} events</div>
  ),
}));

beforeEach(() => {
  localStorage.setItem('demo-mode', '1');
  __resetDemoComments();
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

    const removeBtn = checkoutChip?.querySelector('button');
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

  it('copies a single console message via the row copy button', async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    await user.keyboard('5'); // Console tab
    await waitFor(() => {
      expect(screen.getByTestId('session-console-list')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByTestId('session-console-copy');
    expect(copyButtons.length).toBeGreaterThan(0);
    await user.click(copyButtons[0]);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(typeof writeText.mock.calls[0][0]).toBe('string');
    expect((writeText.mock.calls[0][0] as string).length).toBeGreaterThan(0);
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

  it('deep-links to a tab via ?tab= and writes it on tab change', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
      </>,
      { routerProps: { initialEntries: ['/sessions/1000?tab=network'] } },
    );

    // Opens directly on the Network tab from the URL param.
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });

    // Switching tabs writes the new value back to the URL.
    await user.keyboard('5'); // Console
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(/tab=console/);
    });
  });

  it('still records the playhead when jumping to replay (tab + t coexist)', async () => {
    const user = userEvent.setup();
    renderAtWithLocation(1000);

    await user.keyboard('4'); // Network
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });
    const jumpButtons = screen.getAllByTestId('session-network-jump');
    await user.click(jumpButtons[0]);

    await waitFor(() => {
      const probe = screen.getByTestId('location-probe');
      expect(probe).toHaveTextContent(/t=\d/);
      expect(probe).toHaveTextContent(/tab=replay/);
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

  it('the replay tab badge counts only open comments', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    // Seed has 2 unresolved comments → badge shows 2.
    await waitFor(() => {
      expect(screen.getByTestId('replay-comments-badge')).toHaveTextContent('2');
    });

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
    const firstRow = screen.getAllByTestId('replay-comment')[0];
    await user.click(within(firstRow).getByTestId('replay-comment-resolve'));

    // Resolving one drops the open count to 1.
    await waitFor(() => {
      expect(screen.getByTestId('replay-comments-badge')).toHaveTextContent('1');
    });
  });

  it('shows the comment author byline', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
    // Seed comments carry authors (qa, frontend).
    const authors = screen.getAllByTestId('replay-comment-author');
    expect(authors.length).toBeGreaterThan(0);
    expect(authors[0].textContent).toMatch(/qa|frontend/);
  });

  it('resolves a replay comment and reflects it in the row state', async () => {
    const user = userEvent.setup();
    renderAt(1000);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });

    const firstRow = screen.getAllByTestId('replay-comment')[0];
    expect(firstRow.getAttribute('data-resolved')).toBe('false');

    const resolveBtn = within(firstRow).getByTestId('replay-comment-resolve');
    await user.click(resolveBtn);

    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment')[0].getAttribute('data-resolved')).toBe('true');
    });
  });

  it('hides resolved comments via the panel toggle', async () => {
    const user = userEvent.setup();
    // Dedicated session id — the demo comment store is module-level and
    // leaks across tests, so use an id no other comment test mutates.
    renderAt(1009);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
    const total = screen.getAllByTestId('replay-comment').length;

    // No toggle until at least one comment is resolved.
    expect(screen.queryByTestId('replay-comments-hide-resolved')).not.toBeInTheDocument();

    const firstRow = screen.getAllByTestId('replay-comment')[0];
    await user.click(within(firstRow).getByTestId('replay-comment-resolve'));

    const toggle = await screen.findByTestId('replay-comments-hide-resolved');
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBe(total - 1);
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

  it('seeks to an error via the "e" keyboard shortcut', async () => {
    const user = userEvent.setup();
    renderAtWithLocation(1000);

    await user.keyboard('2'); // Replay tab
    await waitFor(() => {
      expect(screen.getByTestId('replay-next-error')).toBeInTheDocument();
    });

    await user.keyboard('e');
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(/t=\d/);
    });
  });

  it('seeks to an error via the Next error button', async () => {
    const user = userEvent.setup();
    renderAtWithLocation(1000);

    await user.keyboard('2'); // Replay tab
    await waitFor(() => {
      expect(screen.getByTestId('replay-next-error')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('replay-next-error'));

    // jumpToReplay writes the offset into the ?t= query param.
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(/t=\d/);
    });
  });

  it('renders error markers on the Replay minimap', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getByTestId('replay-minimap')).toBeInTheDocument();
    });
    // Seed has a 401 + 500 network row and a console error → red ticks.
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-minimap-error').length).toBeGreaterThan(0);
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

  it('shows a submitted comment optimistically while the save is in flight', async () => {
    const user = userEvent.setup();
    // Dedicated session id — the demo comment store is module-level and
    // leaks across tests, so use an id no other comment test mutates.
    renderAt(1004);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
    const before = screen.getAllByTestId('replay-comment').length;

    await user.type(screen.getByTestId('replay-comment-input'), 'optimistic insert check');
    await user.click(screen.getByTestId('replay-comment-add'));

    // The row lands before the (demo: ~120ms) save settles — muted, with
    // its id-addressed actions disabled — and the input cleared at submit
    // time, not at server-ack time.
    expect(screen.getAllByTestId('replay-comment').length).toBe(before + 1);
    const pendingRow = screen
      .getAllByTestId('replay-comment')
      .find((row) => row.getAttribute('data-pending') === 'true');
    expect(pendingRow).toBeDefined();
    expect(within(pendingRow as HTMLElement).getByTestId('replay-comment-delete')).toBeDisabled();
    expect(screen.getByTestId('replay-comment-input')).toHaveValue('');

    // Once the server id arrives the placeholder sheds its pending state.
    await waitFor(() => {
      const rows = screen.getAllByTestId('replay-comment');
      expect(rows.length).toBe(before + 1);
      expect(rows.every((row) => row.getAttribute('data-pending') === 'false')).toBe(true);
    });
    expect(screen.getByText(/optimistic insert check/)).toBeInTheDocument();
  });

  it('rolls the optimistic comment back and returns the draft when the save fails', async () => {
    const user = userEvent.setup();
    // Dedicated session id (see above) so the rollback maths stay stable.
    renderAt(1005);

    await user.keyboard('2');
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBeGreaterThan(0);
    });
    const before = screen.getAllByTestId('replay-comment').length;

    __failNextDemoCommentSave();
    await user.type(screen.getByTestId('replay-comment-input'), 'doomed comment');
    await user.click(screen.getByTestId('replay-comment-add'));

    // The failed save rolls the placeholder back out and hands the text
    // back to the input so nothing the user typed is lost.
    await waitFor(() => {
      expect(screen.getAllByTestId('replay-comment').length).toBe(before);
    });
    expect(screen.queryByText(/doomed comment/)).not.toBeInTheDocument();
    expect(screen.getByTestId('replay-comment-input')).toHaveValue('doomed comment');
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

  it('copies a Markdown session summary from the header', async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderAt(1000);

    const btn = await screen.findByTestId('session-header-copy-summary');
    await user.click(btn);

    expect(writeText).toHaveBeenCalledTimes(1);
    const md = writeText.mock.calls[0][0] as string;
    // Markdown heading + at least one metadata bullet.
    expect(md).toMatch(/^### /);
    expect(md).toMatch(/- \*\*Session ID:\*\*/);
    // Session 1000 has errors → the derived insights ride along.
    expect(md).toMatch(/\*\*Notable:\*\*/);
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
    const probe = screen.getByTestId('location-probe');
    expect(probe).toHaveTextContent(/t=1200/);
    expect(probe).toHaveTextContent(/tab=replay/);
  });

  it('shows a live presence indicator from the heartbeat', async () => {
    renderAt(1000);
    // Demo presence returns the caller plus a stub teammate → 2 viewing.
    await waitFor(() => {
      expect(screen.getByTestId('session-presence')).toHaveTextContent('2');
    });
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

  it('jumps to the replay moment from an Overview failed-request row', async () => {
    const user = userEvent.setup();
    renderAtWithLocation(1000);
    await waitFor(() => {
      expect(screen.getByTestId('overview-failed-requests')).toBeInTheDocument();
    });

    const jumpRows = screen.getAllByTestId('overview-failed-request-jump');
    expect(jumpRows.length).toBeGreaterThan(0);
    await user.click(jumpRows[0]);

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(/t=\d/);
    });
  });

  it('surfaces a failed-requests card on the Overview tab and jumps to Network', async () => {
    const user = userEvent.setup();
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId('overview-failed-requests')).toBeInTheDocument();
    });
    // Seed has a 401 + 500 → at least one failed-request row.
    expect(screen.getAllByTestId('overview-failed-request-row').length).toBeGreaterThan(0);

    await user.click(screen.getByTestId('overview-failed-requests-jump'));
    await waitFor(() => {
      expect(screen.getByTestId('session-network-table')).toBeInTheDocument();
    });
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
    const probe = screen.getByTestId('location-probe');
    expect(probe).toHaveTextContent(/t=1800/);
    expect(probe).toHaveTextContent(/tab=replay/);
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

  it('renders a Session insights card on the Overview tab', async () => {
    renderAt(1000);
    await waitFor(() => {
      expect(screen.getByTestId('session-insights')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('session-insight-row').length).toBeGreaterThan(0);
  });
});

describe('buildSessionInsights', () => {
  const base = { consoleErrors: [], failedRequests: [], networkRows: [], rageClicks: [] };

  it('reports a clean session when there is nothing notable', () => {
    const out = buildSessionInsights({ ...base, sessionStartMs: 0 });
    expect(out).toHaveLength(1);
    expect(out[0].text).toMatch(/Clean session/);
    expect(out[0].jumpMs).toBeUndefined();
  });

  it('counts errors and points the jump at the earliest one', () => {
    const out = buildSessionInsights({
      ...base,
      consoleErrors: [{ timestamp: 5000 }, { timestamp: 9000 }],
      failedRequests: [{ timestamp: 6000, status: 500, method: 'GET', url: 'https://x/api' }],
      sessionStartMs: 0,
    });
    expect(out[0].text).toMatch(/2 console errors and 1 failed request/);
    expect(out[0].jumpMs).toBe(5000);
  });

  it('detects an error cluster within a 3s window', () => {
    const out = buildSessionInsights({
      ...base,
      consoleErrors: [{ timestamp: 10000 }, { timestamp: 11000 }, { timestamp: 12000 }],
      sessionStartMs: 0,
    });
    const cluster = out.find((i) => /cluster/.test(i.text));
    expect(cluster).toBeDefined();
    expect(cluster?.jumpMs).toBe(10000);
  });

  it('surfaces the largest response with a jump', () => {
    const out = buildSessionInsights({
      ...base,
      networkRows: [
        { timestamp: 1000, encodedDataLength: 500, method: 'GET', url: 'https://x/a' },
        { timestamp: 2000, encodedDataLength: 90000, method: 'GET', url: 'https://x/big.js' },
      ],
      rageClicks: [{ startMs: 3000, count: 4 }],
      sessionStartMs: 0,
    });
    const largest = out.find((i) => /Largest response/.test(i.text));
    expect(largest?.text).toMatch(/big\.js/);
    expect(largest?.jumpMs).toBe(2000);
    const rage = out.find((i) => /Rage-click/.test(i.text));
    expect(rage?.jumpMs).toBe(3000);
  });
});
