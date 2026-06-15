// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Logger } from './Logger.js';
import { SelectorComputer } from './SelectorComputer.js';
import { getClickableTargetFromEvent, getMouseEventOffsets, haultImmediateEvent } from './util.js';
class SelectorPicker {
    #logger;
    #computer;
    constructor(bindings, customAttribute = '', debug = true) {
        this.#logger = new Logger(debug ? 'debug' : 'silent');
        this.#logger.log('Creating a SelectorPicker');
        this.#computer = new SelectorComputer(bindings, this.#logger, customAttribute);
    }
    #handleClickEvent = (event) => {
        haultImmediateEvent(event);
        const target = getClickableTargetFromEvent(event);
        globalThis.captureSelectors(JSON.stringify({
            selectors: this.#computer.getSelectors(target),
            ...getMouseEventOffsets(event, target),
        }));
    };
    start = () => {
        this.#logger.log('Setting up selector listeners');
        globalThis.addEventListener('click', this.#handleClickEvent, true);
        globalThis.addEventListener('mousedown', haultImmediateEvent, true);
        globalThis.addEventListener('mouseup', haultImmediateEvent, true);
    };
    stop = () => {
        this.#logger.log('Tearing down selector listeners');
        globalThis.removeEventListener('click', this.#handleClickEvent, true);
        globalThis.removeEventListener('mousedown', haultImmediateEvent, true);
        globalThis.removeEventListener('mouseup', haultImmediateEvent, true);
    };
}
export { SelectorPicker };
//# sourceMappingURL=SelectorPicker.js.map