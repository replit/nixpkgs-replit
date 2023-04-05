"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.enumeratePropertiesTemplate = exports.enumerateProperties = void 0;
const index_1 = require("./index");
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enumerates completion items of the property.
 */
exports.enumerateProperties = index_1.remoteFunction(function (target, prefix, isGlobal) {
    const defaultType = isGlobal ? "variable" /* Variable */ : "property" /* Property */;
    const getCompletionKind = (name, dtype, value) => {
        if (dtype !== 'function') {
            return defaultType;
        }
        if (name === 'constructor') {
            return "class" /* Class */;
        }
        // Say this value is a class if either it stringifies into a native ES6
        // class declaration, or it's native that starts with a capital letter.
        // No, there's not really a better way to do this.
        // https://stackoverflow.com/questions/30758961/how-to-check-if-a-variable-is-an-es6-class-declaration
        const stringified = String(value);
        if (stringified.startsWith('class ') ||
            (stringified.includes('[native code]') && /^[A-Z]/.test(name))) {
            return "class" /* Class */;
        }
        return isGlobal ? "function" /* Function */ : "method" /* Method */;
    };
    const result = [];
    const discovered = new Set();
    let sortPrefix = '~';
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let object = target === undefined ? this : target;
    for (; object != null; object = object.__proto__) {
        sortPrefix += '~';
        const props = Object.getOwnPropertyNames(object).filter(l => l.startsWith(prefix) && !l.match(/^\d+$/));
        for (const name of props) {
            if (discovered.has(name)) {
                continue;
            }
            discovered.add(name);
            const descriptor = Object.getOwnPropertyDescriptor(object, name);
            let type = defaultType;
            try {
                type = getCompletionKind(name, typeof (descriptor === null || descriptor === void 0 ? void 0 : descriptor.value), object[name]);
            }
            catch (_a) {
                // ignored -- the act of accessing some properties has side effects
                // or can throw errors, fall back to the default type in those cass.
            }
            result.push({
                label: name,
                // Replace leading underscores with `{` (ordered after alphanum) so
                // that 'private' fields get shown last.
                sortText: sortPrefix + name.replace(/^_+/, m => '{'.repeat(m.length)),
                type,
            });
        }
        // After we go through the first level of properties and into the
        // prototype chain, we'll never be in the global scope.
        isGlobal = false;
    }
    return { result, isArray: this instanceof Array };
});
/**
 * Enumerates completion items of a primitive expression.
 */
exports.enumeratePropertiesTemplate = index_1.templateFunction(exports.enumerateProperties.source);
//# sourceMappingURL=enumerateProperties.js.map
//# sourceMappingURL=enumerateProperties.js.map
