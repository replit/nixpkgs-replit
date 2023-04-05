"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DapTelemetryReporter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractErrorDetails = exports.DapTelemetryReporter = void 0;
const inversify_1 = require("inversify");
const events_1 = require("../common/events");
const objUtils_1 = require("../common/objUtils");
const ioc_extras_1 = require("../ioc-extras");
const classification_1 = require("./classification");
const opsReportBatch_1 = require("./opsReportBatch");
/**
 * A telemetry reporter is a logging interface that pushes telemetry events
 * over DAP.
 */
let DapTelemetryReporter = DapTelemetryReporter_1 = class DapTelemetryReporter {
    constructor(isVsCode = true) {
        this.isVsCode = isVsCode;
        /**
         * Either a connected DAP connection, or telemetry queue.
         */
        this.target = [];
        this.flushEmitter = new events_1.EventEmitter();
        this.loggers = classification_1.createLoggers(params => this.pushOutput(params));
        this.batchFlushTimeout = {};
        this.batchers = {
            dapOperation: new opsReportBatch_1.ReporterBatcher(this.isVsCode),
            cdpOperation: new opsReportBatch_1.ReporterBatcher(this.isVsCode),
        };
        /**
         * Event that fires when the reporter wants to flush telemetry. Consumers
         * can hook into this to lazily provide pre-shutdown information.
         */
        this.onFlush = this.flushEmitter.event;
        this.setGlobalMetric = this.loggers.setGlobalMetric;
    }
    /**
     * @inheritdoc
     */
    report(key, ...args) {
        const fn = this.loggers[key];
        // Weirdly, TS doesn't seem to be infer that args is the
        // same Parameters<Fn[K]> that fn (Fn[K]) is.
        fn(...args);
    }
    /**
     * @inheritdoc
     */
    reportOperation(key, method, duration, error) {
        this.batchers[key].add(method, duration, error);
        if (this.batchFlushTimeout[key] === undefined) {
            this.batchFlushTimeout[key] = setTimeout(() => {
                this.report(key, this.batchers[key].flush());
                this.batchFlushTimeout[key] = undefined;
            }, DapTelemetryReporter_1.batchFlushInterval);
        }
    }
    /**
     * @inheritdoc
     */
    attachDap(dap) {
        if (this.target instanceof Array) {
            this.target.forEach(event => dap.output(event));
        }
        this.target = dap;
    }
    /**
     * @inheritdoc
     */
    flush() {
        this.flushEmitter.fire();
        const pending = Object.entries(this.batchFlushTimeout);
        for (const [key, value] of pending) {
            const metrics = this.batchers[key].flush();
            if (metrics.length) {
                this.report(key, metrics);
            }
            this.batchFlushTimeout[key] = undefined;
            clearTimeout(value);
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        for (const timeout of Object.values(this.batchFlushTimeout)) {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }
    /**
     * Pushes raw telemetry.
     */
    pushOutput(event) {
        event.data = mapOutput(event.data);
        if (this.target instanceof Array) {
            this.target.push(event);
        }
        else {
            this.target.output(event);
        }
    }
};
/**
 * How often to flush telemetry batches.
 */
DapTelemetryReporter.batchFlushInterval = 5000;
DapTelemetryReporter = DapTelemetryReporter_1 = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.IsVSCode))
], DapTelemetryReporter);
exports.DapTelemetryReporter = DapTelemetryReporter;
const mapOutput = (obj) => {
    if (typeof obj === 'number') {
        return Number(obj.toFixed(1)); // compress floating point numbers
    }
    if (typeof obj !== 'object' || !obj) {
        return obj;
    }
    // Replace errors with their sanitized details
    if (obj instanceof Error) {
        return extractErrorDetails(obj);
    }
    if (obj instanceof Array) {
        return obj.map(mapOutput);
    }
    return objUtils_1.mapValues(obj, mapOutput);
};
// Pattern: The pattern recognizes file paths and captures the file name and the colon at the end.
// Next line is a sample path aligned with the regexp parts that recognize it/match it. () is for the capture group
//                                C  :     \  foo      \  (in.js:)
//                                C  :     \  foo\ble  \  (fi.ts:)
const extractFileNamePattern = /(?:[A-z]:)?(?:[\\/][^:]*)+[\\/]([^:]*:)/g;
/**
 * Converts the Error to an nice object with any private paths replaced.
 */
function extractErrorDetails(e) {
    const message = String(e.message);
    const name = String(e.name);
    extractFileNamePattern.lastIndex = 0;
    const stack = typeof e.stack === 'string' ? e.stack.replace(extractFileNamePattern, '$1') : undefined;
    return { error: { message, name, stack } };
}
exports.extractErrorDetails = extractErrorDetails;
//# sourceMappingURL=dapTelemetryReporter.js.map
//# sourceMappingURL=dapTelemetryReporter.js.map
