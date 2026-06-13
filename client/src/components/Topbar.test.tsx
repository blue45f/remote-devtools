import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Topbar } from './Topbar';

import { useAppStore } from '@/lib/store';
import { renderWithProviders } from '@/test/utils';

beforeEach(() => {
  act(() => {
    useAppStore.setState({ demoMode: false });
  });
});

afterEach(() => {
  act(() => {
    useAppStore.setState({ demoMode: false });
  });
});

describe('Topbar', () => {
  it('builds breadcrumbs from the current pathname', () => {
    renderWithProviders(<Topbar />, {
      routerProps: { initialEntries: ['/sessions/42'] },
    });
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('links non-leaf breadcrumbs back to their section', () => {
    renderWithProviders(<Topbar />, {
      routerProps: { initialEntries: ['/sessions/42'] },
    });
    const sessionsLink = screen.getByRole('link', { name: 'Sessions' });
    expect(sessionsLink).toHaveAttribute('href', '/sessions');
  });

  it('shows the demo badge only when demo mode is active', () => {
    const { rerender } = renderWithProviders(<Topbar />);
    expect(screen.queryByTestId('demo-mode-badge')).not.toBeInTheDocument();

    act(() => {
      useAppStore.setState({ demoMode: true });
    });
    rerender(<Topbar />);
    expect(screen.getByTestId('demo-mode-badge')).toBeInTheDocument();
  });

  it('renders a search trigger that opens the command palette', () => {
    renderWithProviders(<Topbar />);
    // The button's accessible name mirrors its visible "Search" label
    // (WCAG 2.5.3); the command-palette intent lives in the title tooltip and
    // the shortcut is exposed via aria-keyshortcuts.
    const trigger = screen.getByRole('button', { name: /Search/ });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('title', 'Open command palette');
    expect(trigger).toHaveAttribute('aria-keyshortcuts');
  });
});
