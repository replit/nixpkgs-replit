"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContextForType = void 0;
const escape = (str) => str.replace(/\\/gm, '\\\\').replace(/\n/gm, '\\n').replace(/\r/gm, '\\r').replace(/\t/gm, '\\t');
const repl = { budget: 100000, quoted: true };
const hover = {
    budget: 1000,
    quoted: true,
    postProcess: escape,
};
const copy = { budget: Infinity, quoted: false };
const watch = { budget: 1000, quoted: true, postProcess: escape };
const fallback = { budget: 100, quoted: true };
exports.getContextForType = (type) => {
    switch (type) {
        case "repl" /* Repl */:
            return repl;
        case "hover" /* Hover */:
            return hover;
        case "propertyValue" /* PropertyValue */:
            return hover;
        case "watch" /* Watch */:
            return watch;
        case "copy" /* Copy */:
        case "clipboard" /* Clipboard */:
            return copy;
        default:
            // the type is received straight from the DAP, so it's possible we might
            // get unknown types in the future. Fallback rather than e.g. throwing.
            return fallback;
    }
};
//# sourceMappingURL=contexts.js.map
//# sourceMappingURL=contexts.js.map
