import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LandingPage from './Landing';

import { renderWithProviders } from '@/test/utils';

// jsdom does no layout, so the mid-breakpoint (768–1023px) fit is guarded
// structurally: the classes asserted here are exactly the ones that keep the
// fixed-height header and the footer from breaking at tablet widths.
describe('LandingPage header', () => {
  it('keeps nav labels on one line at tablet widths', () => {
    renderWithProviders(<LandingPage />);

    // The nav appears at md where the row is at capacity: labels must not
    // fold to two lines, and gaps stay tight until lg.
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('whitespace-nowrap');
    expect(nav).toHaveClass('gap-x-3');
    expect(nav).toHaveClass('lg:gap-x-5');

    // Under pressure the brand name is the designed give-way item — it must
    // stay shrinkable (min-w-0) with a truncating label, or the no-wrap row
    // overflows the viewport instead.
    const brand = screen.getByRole('link', { name: 'Remote DevTools' });
    expect(brand).toHaveClass('min-w-0');
    expect(brand.querySelector('.truncate')).not.toBeNull();
  });
});

describe('LandingPage footer', () => {
  it('reflows links via flex-wrap and keeps the policy links', () => {
    renderWithProviders(<LandingPage />);

    // flex-wrap is what lets the link row reflow at 600–834px instead of
    // overflowing once links are added (e.g. the TermsDesk legal set).
    const footer = screen.getByRole('contentinfo');
    expect(footer.querySelector('.flex-wrap')).not.toBeNull();

    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      expect.stringContaining('termsdesk'),
    );
  });
});
