"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReporterBatcher = void 0;
/**
 * Batches reported metrics per method call, giving performance information.
 */
class ReporterBatcher {
    constructor(isVSCode = true) {
        this.isVSCode = isVSCode;
        // prototype-free object so that we don't need to do hasOwnProperty checks
        this.measurements = Object.create(null);
    }
    /**
     * Adds a new measurement for the given method.
     */
    add(method, measurement, error) {
        let arr = this.measurements[method];
        if (!arr) {
            arr = this.measurements[method] = { times: [], errors: [] };
        }
        arr.times.push(measurement);
        if (error) {
            arr.errors.push(error);
        }
    }
    /**
     * Returns a summary of collected measurements taken
     * since the last flush() call.
     */
    flush() {
        const results = { errors: [] };
        for (const key in this.measurements) {
            const { times, errors } = this.measurements[key];
            const item = {
                operation: key,
                totalTime: 0,
                max: 0,
                avg: 0,
                stddev: 0,
                count: times.length,
                failed: errors.length,
            };
            for (const t of times) {
                item.totalTime += t;
                item.max = Math.max(item.max, t);
            }
            item.avg = item.totalTime / item.count;
            for (const t of times) {
                item.stddev += (t - item.avg) ** 2;
            }
            item.stddev = Math.sqrt(item.stddev / (times.length - 1));
            results[item.operation] = item;
            results[`!${item.operation}.errors`] = errors;
            // property without excalamation for VS
            if (!this.isVSCode) {
                results[`${item.operation}.errors`] = errors;
            }
        }
        this.measurements = Object.create(null);
        return results;
    }
}
exports.ReporterBatcher = ReporterBatcher;
//# sourceMappingURL=opsReportBatch.js.map
//# sourceMappingURL=opsReportBatch.js.map
