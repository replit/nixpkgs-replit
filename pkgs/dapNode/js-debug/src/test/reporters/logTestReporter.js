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
const mocha = __importStar(require("mocha"));
const logReporterUtils_1 = require("./logReporterUtils");
class LoggingReporter extends mocha.reporters.Spec {
    constructor(runner) {
        super(runner);
        runner.on('pass', (test) => {
            if (LoggingReporter.alwaysDumpLogs) {
                return this.dumpLogs(test);
            }
        });
        runner.on('fail', (test) => {
            return this.dumpLogs(test);
        });
    }
    async dumpLogs(test) {
        if (!(test instanceof mocha.Test))
            return;
        const logPath = logReporterUtils_1.getLogFileForTest(test.fullTitle());
        console.log(`##vso[build.uploadlog]${logPath}`);
    }
}
LoggingReporter.alwaysDumpLogs = process.env['DUMP_LOGS'];
module.exports = LoggingReporter;
//# sourceMappingURL=logTestReporter.js.map
//# sourceMappingURL=logTestReporter.js.map
