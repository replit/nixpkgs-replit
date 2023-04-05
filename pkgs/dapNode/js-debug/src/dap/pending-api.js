"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPendingDapApi = void 0;
const promiseUtil_1 = require("../common/promiseUtil");
exports.createPendingDapApi = () => {
    let underlying;
    let queue = promiseUtil_1.getDeferred();
    const get = (_target, method) => {
        if (method === 'connect') {
            return (api) => {
                queue.resolve(api);
                underlying = api;
            };
        }
        if (method === 'disconnect') {
            return () => {
                queue = promiseUtil_1.getDeferred();
                underlying = undefined;
            };
        }
        return async (...args) => {
            const api = underlying || (await queue.promise);
            return api[method](...args);
        };
    };
    return new Proxy({}, { get });
};
//# sourceMappingURL=pending-api.js.map
//# sourceMappingURL=pending-api.js.map
