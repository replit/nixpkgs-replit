"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationTokenSource = exports.Cancelled = exports.NeverCancelled = exports.cancellableRace = exports.timeoutPromise = exports.TaskCancelledError = void 0;
const protocolError_1 = require("../dap/protocolError");
const events_1 = require("./events");
const promiseUtil_1 = require("./promiseUtil");
/**
 * Thrown from `cancellableRace` if cancellation is requested.
 */
class TaskCancelledError extends protocolError_1.ProtocolError {
    constructor(message) {
        super({ id: 9243 /* TaskCancelled */, format: message, showUser: true });
        this._cause = { id: 9243 /* TaskCancelled */, format: message, showUser: true };
    }
}
exports.TaskCancelledError = TaskCancelledError;
/**
 * Returns the result of the promise if it resolves before the cancellation
 * is requested. Otherwise, throws a TaskCancelledError.
 */
function timeoutPromise(promise, cancellation, message) {
    if (cancellation.isCancellationRequested) {
        return Promise.reject(new TaskCancelledError(message || 'Task cancelled'));
    }
    const didTimeout = promiseUtil_1.getDeferred();
    const disposable = cancellation.onCancellationRequested(didTimeout.resolve);
    return Promise.race([
        didTimeout.promise.then(() => {
            throw new TaskCancelledError(message || 'Task cancelled');
        }),
        promise
            .then(r => {
            disposable.dispose();
            return r;
        })
            .catch(err => {
            disposable.dispose();
            throw err;
        }),
    ]);
}
exports.timeoutPromise = timeoutPromise;
/**
 * Like Promise.race, but cancels other promises after the first returns.
 */
function cancellableRace(promises, parent) {
    const cts = new CancellationTokenSource(parent);
    const todo = promises.map(async (fn) => {
        try {
            return await fn(cts.token);
        }
        finally {
            cts.cancel();
        }
    });
    return Promise.race(todo);
}
exports.cancellableRace = cancellableRace;
const shortcutEvent = Object.freeze(function (callback, context) {
    const handle = setTimeout(callback.bind(context), 0);
    return {
        dispose() {
            clearTimeout(handle);
        },
    };
});
exports.NeverCancelled = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => undefined }),
});
exports.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent,
});
/**
 * A cancellation source creates and controls a [cancellation token](#CancellationToken).
 * Mirrored here because the debugger internals can't depend on concrete types
 * from `vscode`.
 */
class CancellationTokenSource {
    constructor(parent) {
        this._token = undefined;
        this._parentListener = undefined;
        this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
    }
    /**
     * Returns a cancellation token source that times out after the given duration.
     */
    static withTimeout(timeout, parent) {
        const cts = new CancellationTokenSource(parent);
        const token = (cts._token = new MutableToken());
        const timer = setTimeout(() => token.cancel(), timeout);
        token.onCancellationRequested(() => clearTimeout(timer));
        return cts;
    }
    get token() {
        if (!this._token) {
            // be lazy and create the token only when
            // actually needed
            this._token = new MutableToken();
        }
        return this._token;
    }
    cancel() {
        if (!this._token) {
            // save an object by returning the default
            // cancelled token when cancellation happens
            // before someone asks for the token
            this._token = exports.Cancelled;
        }
        else if (this._token instanceof MutableToken) {
            // actually cancel
            this._token.cancel();
        }
    }
    dispose(cancel = false) {
        if (cancel) {
            this.cancel();
        }
        if (this._parentListener) {
            this._parentListener.dispose();
        }
        if (!this._token) {
            // ensure to initialize with an empty token if we had none
            this._token = exports.NeverCancelled;
        }
        else if (this._token instanceof MutableToken) {
            // actually dispose
            this._token.dispose();
        }
    }
}
exports.CancellationTokenSource = CancellationTokenSource;
class MutableToken {
    constructor() {
        this._isCancelled = false;
        this._emitter = null;
    }
    cancel() {
        if (!this._isCancelled) {
            this._isCancelled = true;
            if (this._emitter) {
                this._emitter.fire(undefined);
                this.dispose();
            }
        }
    }
    get isCancellationRequested() {
        return this._isCancelled;
    }
    get onCancellationRequested() {
        if (this._isCancelled) {
            return shortcutEvent;
        }
        if (!this._emitter) {
            this._emitter = new events_1.EventEmitter();
        }
        return this._emitter.event;
    }
    dispose() {
        if (this._emitter) {
            this._emitter.dispose();
            this._emitter = null;
        }
    }
}
//# sourceMappingURL=cancellation.js.map
//# sourceMappingURL=cancellation.js.map
