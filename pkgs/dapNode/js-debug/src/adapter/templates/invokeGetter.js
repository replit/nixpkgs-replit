"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeGetter = void 0;
const _1 = require(".");
/**
 * Gets the object property.
 */
exports.invokeGetter = _1.remoteFunction(function (property) {
    return this[property];
});
//# sourceMappingURL=invokeGetter.js.map
//# sourceMappingURL=invokeGetter.js.map
