// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as WasmParserWorker from './wasmparser_worker.js';
globalThis.onmessage = (event) => {
    const method = event.data.method;
    if (method !== 'disassemble') {
        return;
    }
    globalThis.postMessage(WasmParserWorker.WasmParserWorker.dissambleWASM(event.data.params, (message) => {
        globalThis.postMessage(message);
    }));
};
globalThis.postMessage('workerReady');
//# sourceMappingURL=wasmparser_worker-entrypoint.prebundle.js.map