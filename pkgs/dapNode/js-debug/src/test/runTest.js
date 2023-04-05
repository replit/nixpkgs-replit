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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const minimist_1 = __importDefault(require("minimist"));
const path = __importStar(require("path"));
const vscode_test_1 = require("vscode-test");
async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '..' + path.sep + '..' + path.sep);
        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, '.' + path.sep + 'testRunner');
        process.env.PWA_TEST_OPTIONS = JSON.stringify(minimist_1.default(process.argv.slice(2)));
        // Download VS Code, unzip it and run the integration test
        await vscode_test_1.runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            version: process.env.JSDBG_TEST_VERSION,
            launchArgs: [
                path.resolve(__dirname, '../../..'),
                '--disable-extensions',
                '--disable-user-env-probe',
            ],
        });
    }
    catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=runTest.js.map
//# sourceMappingURL=runTest.js.map
