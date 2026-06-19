import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Reveal } from './reveal';

// The Reveal wrapper must never gate content on JS: in a headless render (where
// the IntersectionObserver never fires) the children must still be present in
// the DOM, so the section can't ship blank.
describe('Reveal', () => {
  it('renders its children regardless of viewport intersection', () => {
    render(
      <Reveal>
        <p>Replay any session</p>
      </Reveal>,
    );
    expect(screen.getByText('Replay any session')).toBeInTheDocument();
  });

  it('passes through the className and renders the requested element', () => {
    const { container } = render(
      <Reveal as="li" className="feature-card">
        <span>Live capture</span>
      </Reveal>,
    );
    const li = container.querySelector('li');
    expect(li).not.toBeNull();
    expect(li).toHaveClass('feature-card');
    expect(screen.getByText('Live capture')).toBeInTheDocument();
  });
});
