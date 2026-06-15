import*as e from"./wasmparser_worker.js";globalThis.onmessage=s=>{s.data.method==="disassemble"&&globalThis.postMessage(e.WasmParserWorker.dissambleWASM(s.data.params,a=>{globalThis.postMessage(a)}))};globalThis.postMessage("workerReady");
//# sourceMappingURL=wasmparser_worker-entrypoint.js.map
