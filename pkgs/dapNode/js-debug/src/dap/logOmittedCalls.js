"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.omitLoggingFor = exports.logOmittedCalls = void 0;
exports.logOmittedCalls = new WeakSet();
/**
 * Omits logging a call when the given object is used as parameters for
 * a method call. This is, at the moment, solely used to prevent logging
 * log output and getting into an feedback loop with the ConsoleLogSink.
 */
exports.omitLoggingFor = (obj) => {
    exports.logOmittedCalls.add(obj);
    return obj;
};
//# sourceMappingURL=logOmittedCalls.js.map
//# sourceMappingURL=logOmittedCalls.js.map
