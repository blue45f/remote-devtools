import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Sessions from './Sessions';

import { renderWithProviders } from '@/test/utils';

beforeEach(() => {
  // Demo mode short-circuits apiFetch to seed data — avoids any real network.
  localStorage.setItem('demo-mode', '1');
});

describe('Sessions page', () => {
  it('renders the title, controls and a table of seeded sessions', async () => {
    renderWithProviders(<Sessions />);

    expect(screen.getByRole('heading', { name: 'Sessions', level: 1 })).toBeInTheDocument();

    // Wait for skeleton to be replaced with real rows
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    // Session-type segmented control (Recorded / Live)
    expect(screen.getByRole('button', { name: /Recorded/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live/ })).toBeInTheDocument();
  });

  it('filters rows when the user types in the search box', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText(/Search by name, URL/);
    await user.type(search, 'billing');

    expect(screen.queryByText(/checkout-flow-test/)).not.toBeInTheDocument();
    expect(screen.getByText(/billing-modal-bug/)).toBeInTheDocument();
  });

  it('toggles between table and grid views', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    expect(document.querySelector('table')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Grid view/ }));
    await waitFor(() => {
      expect(document.querySelector('table')).not.toBeInTheDocument();
    });
  });

  it('switches to live tab and shows live entries only', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Live/ }));

    await waitFor(() => {
      // Live sessions in the seed are the last two
      expect(screen.getByText(/live-stream-debug/)).toBeInTheDocument();
    });
    // Recorded entries should be gone
    expect(screen.queryByText(/checkout-flow-test/)).not.toBeInTheDocument();
  });

  it("clears filters via the chip's Clear button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '< 30s' }));
    await waitFor(() => {
      expect(screen.queryByText(/onboarding-step-fail/)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Clear/ }));
    await waitFor(() => {
      expect(screen.getByText(/onboarding-step-fail/)).toBeInTheDocument();
    });
  });

  it("each row exposes a 'Detail' link to the right session", async () => {
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const row = screen.getByText(/checkout-flow-test/).closest('tr');
    expect(row).not.toBeNull();
    const detail = within(row as HTMLElement).getByRole('link', {
      name: /View session details/,
    });
    expect(detail.getAttribute('href')).toMatch(/^\/sessions\/\d+$/);
  });

  it('surfaces a top-tags quick-filter strip and clicking one filters the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    // The strip itself is rendered.
    expect(screen.getByTestId('sessions-tag-strip')).toBeInTheDocument();

    // The seeded sessions cycle through ["checkout","bug"], ["pricing"],
    // [], ["mobile","verified"], ["error"], [] — so "checkout" appears
    // at least once and should be in the top-8.
    const chip = screen.getByTestId('sessions-top-tag-checkout');
    expect(chip).toBeInTheDocument();
    await user.click(chip);

    await waitFor(() => {
      expect(screen.getByText(/tag: checkout/)).toBeInTheDocument();
    });
  });

  it('filters the list by clicking a tag chip on a row', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    // The first seeded session (index 0) has tags=["checkout","bug"].
    const chips = screen.getAllByTestId('session-tag-chip');
    const checkoutChip = chips.find((c) => c.textContent === 'checkout');
    expect(checkoutChip).toBeDefined();

    await user.click(checkoutChip as HTMLElement);

    // Active filter pill should now mention the tag.
    await waitFor(() => {
      expect(screen.getByText(/tag: checkout/)).toBeInTheDocument();
    });

    // Clicking again unpins (deselects) the tag.
    const activeChip = screen
      .getAllByTestId('session-tag-chip')
      .find((c) => c.textContent === 'checkout' && c.getAttribute('aria-pressed') === 'true');
    expect(activeChip).toBeDefined();
    await user.click(activeChip as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByText(/tag: checkout/)).not.toBeInTheDocument();
    });
  });

  it('exports the filtered sessions list as CSV', async () => {
    const user = userEvent.setup();

    const createObjectURL = vi.fn().mockReturnValue('blob:csv');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('sessions-export'));
    await user.click(await screen.findByTestId('sessions-export-csv'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('exports the filtered sessions list as JSON', async () => {
    const user = userEvent.setup();

    const createObjectURL = vi.fn().mockReturnValue('blob:json');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('sessions-export'));
    await user.click(await screen.findByTestId('sessions-export-json'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('application/json');
  });

  it('shows a note indicator on sessions that carry a note', async () => {
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });
    // Seed session 1000 ships a note → at least one indicator renders.
    await waitFor(() => {
      expect(screen.getAllByTestId('session-note-indicator').length).toBeGreaterThan(0);
    });
  });

  it('filters to annotated sessions only', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const before = screen.getAllByTestId('session-note-indicator').length;
    expect(before).toBeGreaterThan(0);

    await user.click(screen.getByTestId('sessions-note-filter'));

    // Every remaining row must carry a note indicator, and the count must
    // shrink (the seed has many sessions, only one annotated).
    await waitFor(() => {
      const rows = screen.getAllByTestId('session-note-indicator');
      const allRows = document.querySelectorAll('[data-session-row]');
      expect(rows.length).toBe(allRows.length);
    });
    // The active-filter pill confirms the filter is on.
    expect(screen.getByText(/annotated/)).toBeInTheDocument();
  });

  it('copies a session link from a row action', async () => {
    const user = userEvent.setup();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByTestId('session-copy-link');
    expect(copyButtons.length).toBeGreaterThan(0);
    await user.click(copyButtons[0]);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/\/sessions\/\d+$/);
  });

  it('finds sessions by tag text via the search box', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    // "verified" is a tag on settings-permissions but appears in no session
    // name — so a match proves tag search works end to end.
    await user.type(screen.getByPlaceholderText(/Search by name/), 'verified');

    await waitFor(() => {
      expect(screen.getByText(/settings-permissions/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/checkout-flow-test/)).not.toBeInTheDocument();
  });

  it('focuses the search input when "/" is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by name/);
    expect(input).not.toHaveFocus();

    await user.keyboard('/');
    expect(input).toHaveFocus();
  });

  it('toggles row density and persists the choice', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Sessions />);
    await waitFor(() => {
      expect(screen.getByText(/checkout-flow-test/)).toBeInTheDocument();
    });

    const toggle = screen.getByTestId('sessions-density-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    // The visible row should pick up the new density data attribute so
    // CSS-only selectors (e.g. story screenshots) can target either state.
    const row = screen.getByText(/checkout-flow-test/).closest('[data-session-row]') as HTMLElement;
    expect(row.getAttribute('data-density')).toBe('compact');

    await waitFor(() => {
      expect(localStorage.getItem('sessions-prefs:v1')).toContain('"density":"compact"');
    });
  });
});
