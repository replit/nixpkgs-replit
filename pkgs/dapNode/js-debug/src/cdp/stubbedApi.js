"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.stubbedCdpApi = void 0;
const sinon_1 = require("sinon");
exports.stubbedCdpApi = () => {
    const stubs = new Map();
    const proxy = new Proxy({}, {
        get: (_target, domain) => {
            if (domain === 'actual') {
                return proxy;
            }
            return new Proxy({}, {
                get: (_target, method) => {
                    let s = stubs.get(`${domain}.${method}`);
                    if (!s) {
                        s = sinon_1.stub();
                        stubs.set(`${domain}.${method}`, s);
                    }
                    return s;
                },
            });
        },
    });
    return proxy;
};
//# sourceMappingURL=stubbedApi.js.map
//# sourceMappingURL=stubbedApi.js.map
