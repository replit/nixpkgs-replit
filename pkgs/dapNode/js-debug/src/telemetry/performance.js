"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPerf = void 0;
/**
 * Measures and logs the performance of decorated functions.
 */
exports.logPerf = async (logger, name, fn, metadata = {}) => {
    const start = Date.now();
    try {
        return await fn();
    }
    finally {
        logger.verbose("perf.function" /* PerfFunction */, '', Object.assign({ method: name, duration: Date.now() - start }, metadata));
    }
};
//# sourceMappingURL=performance.js.map
//# sourceMappingURL=performance.js.map
