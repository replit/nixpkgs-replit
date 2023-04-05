"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArrayProperties = void 0;
const _1 = require(".");
/**
 * Returns non-indexed properties of the array.
 */
exports.getArrayProperties = _1.remoteFunction(function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = { __proto__: this.__proto__ };
    const names = Object.getOwnPropertyNames(this);
    for (let i = 0; i < names.length; ++i) {
        const name = names[i];
        const numeric = name >>> 0;
        // Array index check according to the ES5-15.4.
        if (String(numeric >>> 0) === name && numeric >>> 0 !== 0xffffffff) {
            continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(this, name);
        if (descriptor) {
            Object.defineProperty(result, name, descriptor);
        }
    }
    return result;
});
//# sourceMappingURL=getArrayProperties.js.map
//# sourceMappingURL=getArrayProperties.js.map
