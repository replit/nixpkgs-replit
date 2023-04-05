"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.stubbedDapApi = void 0;
const sinon_1 = require("sinon");
exports.stubbedDapApi = () => {
    const stubs = new Map();
    const proxy = new Proxy({}, {
        get: (target, methodName) => {
            if (methodName === 'actual') {
                return target;
            }
            let s = stubs.get(methodName);
            if (!s) {
                s = sinon_1.stub();
                stubs.set(methodName, s);
            }
            return s;
        },
    });
    return proxy;
};
//# sourceMappingURL=stubbedApi.js.map
//# sourceMappingURL=stubbedApi.js.map
