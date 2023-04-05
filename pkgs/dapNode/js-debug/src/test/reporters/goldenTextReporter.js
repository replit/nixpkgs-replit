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
class GoldenTextReporter extends mocha.reporters.Spec {
    constructor(runner) {
        super(runner);
        runner.on('pass', (test) => {
            if (GoldenTextReporter.alwaysDumpGoldenText) {
                return this.dumpGoldenText(test);
            }
        });
        runner.on('fail', (test) => {
            return this.dumpGoldenText(test);
        });
    }
    async dumpGoldenText(test) {
        if (!(test instanceof mocha.Test))
            return;
        if (test.goldenText && test.goldenText.hasNonAssertedLogs()) {
            console.error('=== Golden Text ===');
            console.error(test.goldenText.getOutput());
        }
    }
}
GoldenTextReporter.alwaysDumpGoldenText = process.env['DUMP_GOLDEN_TEXT'];
module.exports = GoldenTextReporter;
//# sourceMappingURL=goldenTextReporter.js.map
//# sourceMappingURL=goldenTextReporter.js.map
