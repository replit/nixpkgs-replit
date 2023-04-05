"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptions = exports.addHeader = void 0;
/**
 * Adds a header to the outgoing request.
 */
exports.addHeader = (options, key, value) => {
    key = key.toLowerCase();
    const existing = options === null || options === void 0 ? void 0 : options[key];
    return Object.assign(Object.assign({}, options), { [key]: existing
            ? existing instanceof Array
                ? existing.concat(value)
                : [existing, value]
            : value });
};
exports.mergeOptions = (into, from) => {
    const cast = into;
    for (const [key, value] of Object.entries(from)) {
        if (typeof value === 'object' && !!value) {
            cast[key] = Object.assign(cast[key] || {}, value);
        }
        else {
            cast[key] = value;
        }
    }
};
//# sourceMappingURL=helpers.js.map
//# sourceMappingURL=helpers.js.map
