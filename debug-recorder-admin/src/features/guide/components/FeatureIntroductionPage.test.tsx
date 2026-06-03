import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { FeatureIntroductionPage } from './FeatureIntroductionPage';

/**
 * Characterization smoke test: render-only. The page is presentational (it only
 * navigates on click). We assert the static, i18n-driven page heading, the
 * product-name feature cards, and the call-to-action button (pinned to English
 * in test setup). UX_TERMS-interpolated titles depend on env config, so we only
 * assert the copy that is stable regardless of those overrides.
 */
describe('FeatureIntroductionPage', () => {
  it('renders the page heading and feature cards', () => {
    renderWithProviders(<FeatureIntroductionPage />, {
      initialEntries: ['/feature-introduction'],
    });

    // PageContainer title (level-2 heading).
    expect(screen.getByRole('heading', { name: 'Features', level: 2 })).toBeInTheDocument();

    // Static product-name feature cards (not env-interpolated).
    expect(screen.getByText('Network Rewrite')).toBeInTheDocument();
    expect(screen.getByText('Remote DevTools')).toBeInTheDocument();
    expect(screen.getByText('Recording Room')).toBeInTheDocument();
  });

  it('renders the call-to-action button', () => {
    renderWithProviders(<FeatureIntroductionPage />, {
      initialEntries: ['/feature-introduction'],
    });

    expect(screen.getByRole('button', { name: 'Set up user info' })).toBeInTheDocument();
  });
});
