"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteFunction = exports.RemoteException = exports.templateFunctionStr = exports.templateFunction = exports.getSourceSuffix = void 0;
const acorn_1 = require("acorn");
const crypto_1 = require("crypto");
/**
 * Gets the suffix containing the `sourceURL` to mark a script as internal.
 */
exports.getSourceSuffix = () => `\n//# sourceURL=eval-${crypto_1.randomBytes(4).toString('hex')}${".cdp" /* InternalExtension */}\n`;
function templateFunction(fn) {
    return templateFunctionStr('' + fn);
}
exports.templateFunction = templateFunction;
function templateFunctionStr(stringified) {
    const decl = acorn_1.parseExpressionAt(stringified, 0, {
        ecmaVersion: 'latest',
        locations: true,
    });
    if (decl.type !== 'FunctionExpression') {
        throw new Error(`Could not find function declaration for:\n\n${stringified}`);
    }
    const params = decl.params.map(p => {
        if (p.type !== 'Identifier') {
            throw new Error('Parameter must be identifier');
        }
        return p.name;
    });
    const { start, end } = decl.body;
    return (...args) => `(() => {
    ${args.map((a, i) => `let ${params[i]} = ${a}`).join('; ')};
    ${stringified.slice(start + 1, end - 1)}
  })();${exports.getSourceSuffix()}`;
}
exports.templateFunctionStr = templateFunctionStr;
/**
 * Exception thrown from the {@link remoteFunction} on an error.
 */
class RemoteException extends Error {
    constructor(details) {
        super(details.text);
        this.details = details;
    }
}
exports.RemoteException = RemoteException;
/**
 * Wraps the function such that it can be invoked over CDP. Returns a function
 * that takes the CDP and arguments with which to invoke the function. The
 * arguments should be simple objects.
 */
function remoteFunction(fn) {
    const stringified = ('' + fn).replace('}', exports.getSourceSuffix() + '}');
    // Some ugly typing here, but it gets us type safety. Mainly we want to:
    //  1. Have args that extend the function arg and omit the args we provide (easy)
    //  2. If and only if returnByValue is set to true, have that type in our return
    //  3. If and only if it's not set, then return an object ID.
    const result = async (_a) => {
        var { cdp, args } = _a, options = __rest(_a, ["cdp", "args"]);
        const result = await cdp.Runtime.callFunctionOn(Object.assign({ functionDeclaration: stringified, arguments: args.map(value => ({ value })) }, options));
        if (!result) {
            throw new RemoteException({
                exceptionId: 0,
                text: 'No response from CDP',
                lineNumber: 0,
                columnNumber: 0,
            });
        }
        if (result.exceptionDetails) {
            throw new RemoteException(result.exceptionDetails);
        }
        return result.result;
    };
    result.source = stringified;
    return result;
}
exports.remoteFunction = remoteFunction;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
