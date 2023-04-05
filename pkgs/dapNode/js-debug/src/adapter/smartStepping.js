"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartStepper = exports.shouldSmartStepStackFrame = void 0;
const sources_1 = require("./sources");
async function shouldSmartStepStackFrame(stackFrame) {
    const uiLocation = await stackFrame.uiLocation();
    if (!uiLocation) {
        return false;
    }
    if (!sources_1.isSourceWithMap(uiLocation.source)) {
        return false;
    }
    if (!uiLocation.isMapped && uiLocation.unmappedReason === sources_1.UnmappedReason.MapPositionMissing) {
        return true;
    }
    return false;
}
exports.shouldSmartStepStackFrame = shouldSmartStepStackFrame;
const neverStepReasons = new Set(['breakpoint', 'exception', 'entry']);
/**
 * The SmartStepper is a device that controls stepping through code that lacks
 * sourcemaps when running in an application with source maps.
 */
class SmartStepper {
    constructor(launchConfig, logger) {
        this.launchConfig = launchConfig;
        this.logger = logger;
        this._smartStepCount = 0;
    }
    resetSmartStepCount() {
        if (this._smartStepCount > 0) {
            this.logger.verbose("internal" /* Internal */, `smartStep: skipped ${this._smartStepCount} steps`);
            this._smartStepCount = 0;
        }
    }
    /**
     * Determines whether smart stepping should be run for the given pause
     * information. If so, returns the direction of stepping.
     */
    async getSmartStepDirection(pausedDetails, reason) {
        if (!this.launchConfig.smartStep) {
            return;
        }
        if (neverStepReasons.has(pausedDetails.reason)) {
            return;
        }
        const frame = (await pausedDetails.stackTrace.loadFrames(1))[0];
        const should = await shouldSmartStepStackFrame(frame);
        if (!should) {
            this.resetSmartStepCount();
            return;
        }
        this._smartStepCount++;
        return (reason === null || reason === void 0 ? void 0 : reason.reason) === 'step' ? reason.direction : 0 /* In */;
    }
}
exports.SmartStepper = SmartStepper;
//# sourceMappingURL=smartStepping.js.map
//# sourceMappingURL=smartStepping.js.map
