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
exports.resolveLoggerOptions = exports.fulfillLoggerOptions = exports.ILogger = exports.allLogTags = void 0;
const crypto_1 = require("crypto");
const os_1 = require("os");
const path = __importStar(require("path"));
const consoleLogSink_1 = require("./consoleLogSink");
const fileLogSink_1 = require("./fileLogSink");
const logTabObj = {
    ["runtime" /* Runtime */]: null,
    ["runtime.sourcecreate" /* RuntimeSourceCreate */]: null,
    ["runtime.assertion" /* RuntimeAssertion */]: null,
    ["runtime.launch" /* RuntimeLaunch */]: null,
    ["runtime.target" /* RuntimeTarget */]: null,
    ["runtime.welcome" /* RuntimeWelcome */]: null,
    ["runtime.exception" /* RuntimeException */]: null,
    ["runtime.sourcemap" /* RuntimeSourceMap */]: null,
    ["runtime.breakpoints" /* RuntimeBreakpoints */]: null,
    ["sourcemap.parsing" /* SourceMapParsing */]: null,
    ["perf.function" /* PerfFunction */]: null,
    ["cdp.send" /* CdpSend */]: null,
    ["cdp.receive" /* CdpReceive */]: null,
    ["dap.send" /* DapSend */]: null,
    ["dap.receive" /* DapReceive */]: null,
    ["internal" /* Internal */]: null,
    ["proxyActivity" /* ProxyActivity */]: null,
};
/**
 * List of all log tags.
 */
exports.allLogTags = Object.keys(logTabObj);
exports.ILogger = Symbol('ILogger');
const stringToLogLevel = (str) => {
    switch (str.toLowerCase()) {
        case 'verbose':
            return 0 /* Verbose */;
        case 'info':
            return 1 /* Info */;
        case 'warn':
            return 2 /* Warn */;
        case 'error':
            return 3 /* Error */;
        case 'fatal':
            return 4 /* Fatal */;
        default:
            throw new Error(`Unknown log level "${str}"`);
    }
};
/**
 * Fulfills the partial config to a full logging configuration.
 */
function fulfillLoggerOptions(config, logDir = os_1.tmpdir()) {
    if (config === false) {
        return { console: false, level: 'fatal', stdio: false, logFile: null, tags: [] };
    }
    const defaults = {
        console: false,
        level: 'verbose',
        stdio: true,
        logFile: path.join(logDir, `vscode-debugadapter-${crypto_1.randomBytes(4).toString('hex')}.json.gz`),
        tags: [],
    };
    if (config === true) {
        return defaults;
    }
    return Object.assign(Object.assign({}, defaults), config);
}
exports.fulfillLoggerOptions = fulfillLoggerOptions;
/**
 * Creates logger setup options from the given configuration.
 */
function resolveLoggerOptions(dap, config) {
    const fulfilled = fulfillLoggerOptions(config);
    const options = {
        tags: fulfilled.tags,
        level: fulfilled.level === undefined ? 0 /* Verbose */ : stringToLogLevel(fulfilled.level),
        sinks: [],
    };
    if (fulfilled.console) {
        options.sinks.push(new consoleLogSink_1.ConsoleLogSink(dap));
    }
    if (fulfilled.logFile) {
        options.sinks.push(new fileLogSink_1.FileLogSink(fulfilled.logFile, dap));
    }
    return options;
}
exports.resolveLoggerOptions = resolveLoggerOptions;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
