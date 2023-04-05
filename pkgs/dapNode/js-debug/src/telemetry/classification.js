"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggers = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/******************************************************************************
 * Implementations
 *****************************************************************************/
/**
 * Creates typed, classified logging functions. Takes a callback that's
 * invoked when any of the logging functions are called.
 */
exports.createLoggers = (sendEvent) => {
    const globalMetrics = {};
    setJsDebugCommitId(globalMetrics);
    /**
     * Warning! The naming of this method is required to be exactly `publicLog2`
     * for the GDPR tooling to automatically detect.
     */
    function publicLog2(name, props) {
        return sendEvent({
            category: 'telemetry',
            output: name,
            data: props,
        });
    }
    const dapOperation = (metrics) => publicLog2('js-debug/dap/operation', Object.assign(Object.assign({}, globalMetrics), metrics));
    const cdpOperation = (metrics) => publicLog2('js-debug/cdp/operation', Object.assign(Object.assign({}, globalMetrics), metrics));
    const error = (metrics) => publicLog2('js-debug/error', Object.assign(Object.assign({}, globalMetrics), metrics));
    const browserVersion = (metrics) => {
        globalMetrics.browser =
            (metrics.targetProject || metrics.targetProject) + '/' + metrics.targetVersion;
        publicLog2('js-debug/browserVersion', Object.assign(Object.assign({}, globalMetrics), metrics));
    };
    const breakpointStats = (metrics) => publicLog2('js-debug/breakpointStats', Object.assign(Object.assign({}, globalMetrics), metrics));
    const statistics = (metrics) => publicLog2('js-debug/statistics', Object.assign(Object.assign({}, globalMetrics), metrics));
    const nodeRuntime = (metrics) => {
        globalMetrics.nodeVersion = metrics.version;
        publicLog2('js-debug/nodeRuntime', Object.assign(Object.assign({}, globalMetrics), metrics));
    };
    const launch = (metrics) => {
        publicLog2('js-debug/launch', Object.assign(Object.assign(Object.assign({}, globalMetrics), metrics), { parameters: JSON.stringify(metrics.parameters) }));
    };
    const diagnosticPrompt = (metrics) => {
        publicLog2('js-debug/diagnosticPrompt', Object.assign(Object.assign({}, globalMetrics), metrics));
    };
    /**
     * VS contains a file .gitcommit with the exact commit version being shipped.
     * We want to be able to easily track which commit telemetry came from, specially to translate error call stacks
     */
    function setJsDebugCommitId(globalMetrics) {
        try {
            const filePath = path.resolve(path.dirname(__filename), '..', '..', '.gitcommit');
            globalMetrics.jsDebugCommitId = fs.readFileSync(filePath, 'utf8');
        }
        catch (_a) {
            // We don't do anything if we don't have the file, or can't read it
        }
    }
    const setGlobalMetric = (key, value) => {
        globalMetrics[key] = value;
    };
    return {
        breakpointStats,
        statistics,
        browserVersion,
        cdpOperation,
        dapOperation,
        error,
        launch,
        nodeRuntime,
        diagnosticPrompt,
        setGlobalMetric,
    };
};
//# sourceMappingURL=classification.js.map
//# sourceMappingURL=classification.js.map
