"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAsyncStackPolicy = void 0;
const disposable_1 = require("../common/disposable");
const events_1 = require("../common/events");
const disabled = { connect: async () => disposable_1.noOpDisposable };
const eager = (maxDepth) => ({
    async connect(cdp) {
        await cdp.Debugger.setAsyncCallStackDepth({ maxDepth });
        return disposable_1.noOpDisposable;
    },
});
const onceBp = (maxDepth) => {
    const onEnable = new events_1.EventEmitter();
    let enabled = false;
    const tryEnable = () => {
        if (!enabled) {
            enabled = true;
            onEnable.fire();
        }
    };
    return {
        async connect(cdp) {
            if (enabled) {
                await cdp.Debugger.setAsyncCallStackDepth({ maxDepth });
                return disposable_1.noOpDisposable;
            }
            const disposable = new disposable_1.DisposableList();
            disposable.push(
            // Another session enabled breakpoints. Turn this on as well, e.g. if
            // we have a parent page and webworkers, when we debug the webworkers
            // should also have their async stacks turned on.
            onEnable.event(() => {
                disposable.dispose();
                cdp.Debugger.setAsyncCallStackDepth({ maxDepth });
            }), 
            // when a breakpoint resolves, turn on stacks because we're likely to
            // pause sooner or later
            cdp.Debugger.on('breakpointResolved', tryEnable), 
            // start collecting on a pause event. This can be from source map
            // instrumentation, entrypoint breakpoints, debugger statements, or user
            // defined breakpoints. Instrumentation points happen all the time and
            // can be ignored. For others, including entrypoint breaks (which
            // indicate there's a user break somewhere in the file) we should turn on.
            cdp.Debugger.on('paused', evt => {
                if (evt.reason !== 'instrumentation') {
                    tryEnable();
                }
            }));
            return disposable;
        },
    };
};
const defaultPolicy = eager(32);
exports.getAsyncStackPolicy = (mode) => {
    if (mode === false) {
        return disabled;
    }
    if (mode === true) {
        return defaultPolicy;
    }
    if ('onAttach' in mode) {
        return eager(mode.onAttach);
    }
    if ('onceBreakpointResolved' in mode) {
        return onceBp(mode.onceBreakpointResolved);
    }
    return defaultPolicy;
};
//# sourceMappingURL=asyncStackPolicy.js.map
//# sourceMappingURL=asyncStackPolicy.js.map
