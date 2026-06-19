import { motion, useReducedMotion } from 'motion/react';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type RevealDirection = 'up' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Entrance offset direction. `up` (default) rises; `none` is a pure fade. */
  direction?: RevealDirection;
  /** Seconds to wait before the reveal starts — used for sibling stagger. */
  delay?: number;
  /** Travel distance in px for the offset axis. Defaults to 14. */
  distance?: number;
  /** Render as a different element while keeping the motion props. */
  as?: 'div' | 'li' | 'section';
}

const OFFSETS: Record<RevealDirection, { x?: number; y?: number }> = {
  up: { y: 1 },
  left: { x: -1 },
  right: { x: 1 },
  none: {},
};

/**
 * Scroll-reveal wrapper grounded in the operator-grade motion grammar: it only
 * animates opacity + transform with `ease-out-expo`, fires once, and respects
 * `prefers-reduced-motion` (the content renders in its final state with no
 * transform, so there is no CLS and nothing is gated on JS).
 *
 * Reveals enhance an already-laid-out default — the element never collapses to
 * zero height — so a headless render or a hidden tab still ships the content,
 * just without the entrance beat.
 */
export function Reveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  distance = 14,
  as = 'div',
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const Comp = motion[as];

  if (prefersReducedMotion) {
    return <Comp className={className}>{children}</Comp>;
  }

  const offset = OFFSETS[direction];
  return (
    <Comp
      className={cn(className)}
      initial={{
        opacity: 0,
        x: (offset.x ?? 0) * distance,
        y: (offset.y ?? 0) * distance,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.3, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Comp>
  );
}
