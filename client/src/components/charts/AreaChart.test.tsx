import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AreaChart } from './AreaChart';

const trendData = [
  { label: 'Mon', value: 4 },
  { label: 'Tue', value: 9 },
  { label: 'Wed', value: 6 },
];

describe('AreaChart', () => {
  it('uses unique gradient ids when multiple charts render together', () => {
    const { container } = render(
      <div>
        <AreaChart data={trendData} valueLabel="Sessions" />
        <AreaChart data={trendData} valueLabel="Tickets" />
      </div>,
    );

    const ids = Array.from(container.querySelectorAll('linearGradient')).map((node) => node.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
