"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArraySlots = void 0;
const _1 = require(".");
/**
 * Returns an object containing array property descriptors for the given
 * range of array indices.
 */
exports.getArraySlots = _1.remoteFunction(function (start, count) {
    const result = {};
    const from = start === -1 ? 0 : start;
    const to = count === -1 ? this.length : start + count;
    for (let i = from; i < to && i < this.length; ++i) {
        const descriptor = Object.getOwnPropertyDescriptor(this, i);
        if (descriptor) {
            Object.defineProperty(result, i, descriptor);
        }
    }
    return result;
});
//# sourceMappingURL=getArraySlots.js.map
//# sourceMappingURL=getArraySlots.js.map
