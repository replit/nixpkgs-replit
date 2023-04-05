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
exports.filterErrorsReportedToTelemetry = exports.onUncaughtError = exports.installUnhandledErrorReporter = void 0;
const path = __importStar(require("path"));
function installUnhandledErrorReporter(logger, telemetryReporter, isVsCode) {
    const exceptionListener = exports.onUncaughtError(logger, telemetryReporter, "uncaughtException" /* Exception */, isVsCode);
    const rejectionListener = exports.onUncaughtError(logger, telemetryReporter, "unhandledRejection" /* Rejection */, isVsCode);
    process.addListener('uncaughtException', exceptionListener);
    process.addListener('unhandledRejection', rejectionListener);
    return {
        dispose: () => {
            process.removeListener('uncaughtException', exceptionListener);
            process.removeListener('unhandledRejection', rejectionListener);
        },
    };
}
exports.installUnhandledErrorReporter = installUnhandledErrorReporter;
exports.onUncaughtError = (logger, telemetryReporter, src, isVsCode = true) => (error) => {
    if (!shouldReportThisError(error)) {
        return;
    }
    telemetryReporter.report('error', {
        '!error': error,
        error: isVsCode ? undefined : error,
        exceptionType: src,
    });
    logger.error("runtime.exception" /* RuntimeException */, 'Unhandled error in debug adapter', error);
};
const isErrorObjectLike = (err) => typeof err === 'object' && !!err && 'stack' in err;
const debugAdapterFolder = path.dirname(path.dirname(path.dirname(__dirname)));
function shouldReportThisError(error) {
    var _a;
    // In VS Code, this debug adapter runs inside the extension host process, so we could capture
    // errors from other pieces of software here. We check to make sure this is our error before reporting it
    return (!shouldFilterErrorsReportedToTelemetry ||
        (isErrorObjectLike(error) && !!((_a = error.stack) === null || _a === void 0 ? void 0 : _a.includes(debugAdapterFolder))));
}
let shouldFilterErrorsReportedToTelemetry = false;
function filterErrorsReportedToTelemetry() {
    shouldFilterErrorsReportedToTelemetry = true;
}
exports.filterErrorsReportedToTelemetry = filterErrorsReportedToTelemetry;
//# sourceMappingURL=unhandledErrorReporter.js.map
//# sourceMappingURL=unhandledErrorReporter.js.map
