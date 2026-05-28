import { describe, expect, it } from 'vitest';

import { DEVTOOL_OVERLAY, DEVTOOL_STYLESHEET, HTML_TO_CANVAS, IGNORE_NODE } from './constant';

describe('constants', () => {
  it('exposes the expected sentinel strings', () => {
    expect(DEVTOOL_OVERLAY).toBe('__devtools-overlay__');
    expect(DEVTOOL_STYLESHEET).toBe('__devtools-stylesheet__');
    expect(HTML_TO_CANVAS).toBe('html2canvas-container');
  });

  it('IGNORE_NODE contains the three sentinels in declaration order', () => {
    expect(IGNORE_NODE).toEqual([DEVTOOL_OVERLAY, DEVTOOL_STYLESHEET, HTML_TO_CANVAS]);
  });
});
