import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ShortcutsDialog } from './ShortcutsDialog';

import { useAppStore } from '@/lib/store';
import { renderWithProviders } from '@/test/utils';

beforeEach(() => {
  act(() => {
    useAppStore.setState({ shortcutsOpen: false });
  });
});

afterEach(() => {
  act(() => {
    useAppStore.setState({ shortcutsOpen: false });
  });
});

describe('ShortcutsDialog', () => {
  it('is hidden by default', () => {
    renderWithProviders(<ShortcutsDialog />);
    expect(screen.queryByTestId('shortcuts-dialog')).not.toBeInTheDocument();
  });

  it('opens when the store flag flips and lists the registered shortcuts', () => {
    renderWithProviders(<ShortcutsDialog />);

    act(() => {
      useAppStore.setState({ shortcutsOpen: true });
    });

    expect(screen.getByTestId('shortcuts-dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Keyboard shortcuts/ })).toBeInTheDocument();

    // Spot-check entries from each group
    expect(screen.getByText('Open command palette')).toBeInTheDocument();
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Go to Sessions')).toBeInTheDocument();
  });
});
