"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeferred = exports.some = exports.disposableTimeout = exports.delay = void 0;
exports.delay = (duration) => isFinite(duration)
    ? new Promise(resolve => setTimeout(resolve, duration))
    : new Promise(() => undefined);
exports.disposableTimeout = (fn, delay) => {
    const timeout = setTimeout(fn, delay);
    return { dispose: () => clearTimeout(timeout) };
};
/**
 * Returns a promise that resolves as soon as any of the given promises
 * returns a truthy value.
 */
function some(promises) {
    return new Promise((resolve, reject) => {
        let remaining = promises.length;
        for (const prom of promises) {
            prom
                .then(p => {
                if (p) {
                    resolve(p);
                    remaining = -1;
                }
                else if (--remaining === 0) {
                    resolve(undefined);
                }
            })
                .catch(reject);
        }
    });
}
exports.some = some;
function getDeferred() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let resolve = null;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let reject = null;
    let settled = false;
    let settledValue;
    // Promise constructor is called synchronously
    const promise = new Promise((_resolve, _reject) => {
        resolve = (value) => {
            settled = true;
            settledValue = value;
            _resolve(value);
        };
        reject = (error) => {
            settled = true;
            _reject(error);
        };
    });
    return {
        resolve,
        reject,
        promise,
        get settledValue() {
            return settledValue;
        },
        hasSettled: () => settled,
    };
}
exports.getDeferred = getDeferred;
//# sourceMappingURL=promiseUtil.js.map
//# sourceMappingURL=promiseUtil.js.map
