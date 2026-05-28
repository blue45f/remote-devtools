import { describe, expect, it } from 'vitest';

import { Runtime } from './runtime';

function createRuntime() {
  return new Runtime({ socket: null });
}

describe('Runtime.callFunctionOn', () => {
  it('passes falsy primitive argument values through unchanged', () => {
    const runtime = createRuntime();

    const result = runtime.callFunctionOn({
      functionDeclaration:
        'function (zero, disabled, empty) { return `${zero}|${disabled}|${empty}`; }',
      objectId: '',
      arguments: [
        { value: 0, unserializableValue: '', objectId: '' },
        { value: false, unserializableValue: '', objectId: '' },
        { value: '', unserializableValue: '', objectId: '' },
      ],
      silent: false,
    });

    expect(result).toBe('0|false|');
  });
});
