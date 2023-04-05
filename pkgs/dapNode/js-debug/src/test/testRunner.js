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
exports.run = void 0;
const glob = __importStar(require("glob"));
const mocha_1 = __importDefault(require("mocha"));
const path_1 = require("path");
require("./testHooks");
function setupCoverage() {
    const NYC = require('nyc');
    const nyc = new NYC({
        cwd: path_1.join(__dirname, '..', '..', '..'),
        exclude: ['**/test/**', '.vscode-test/**'],
        reporter: ['text', 'html'],
        all: true,
        instrument: true,
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
    });
    nyc.reset();
    nyc.wrap();
    return nyc;
}
async function run() {
    const nyc = process.env.COVERAGE ? setupCoverage() : null;
    const mochaOpts = Object.assign({ timeout: 10 * 1000 }, JSON.parse(process.env.PWA_TEST_OPTIONS || '{}'));
    if (process.env.ONLY_MINSPEC === 'true') {
        mochaOpts.grep = 'node runtime'; // may eventually want a more dynamic system
    }
    const grep = mochaOpts.grep || mochaOpts.g;
    if (grep) {
        mochaOpts.grep = new RegExp(grep, 'i');
    }
    // Paths are relative to Mocha
    const logTestReporter = '../../../out/src/test/reporters/logTestReporter';
    // const goldenTextReporter =
    //   '../../../out/src/test/reporters/goldenTextReporter';
    mochaOpts.reporter = 'mocha-multi-reporters';
    mochaOpts.reporterOptions = {
        // reporterEnabled: `${logTestReporter}, ${goldenTextReporter}`,
        // reporterEnabled: goldenTextReporter
        reporterEnabled: logTestReporter,
    };
    if (process.env.BUILD_ARTIFACTSTAGINGDIRECTORY) {
        mochaOpts.reporterOptions = {
            reporterEnabled: `${logTestReporter}, mocha-junit-reporter`,
            mochaJunitReporterReporterOptions: {
                testsuitesTitle: `tests ${process.platform}`,
                mochaFile: path_1.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, `test-results/TEST-${process.platform}-test-results.xml`),
            },
        };
    }
    const runner = new mocha_1.default(mochaOpts);
    runner.useColors(true);
    // todo: retry failing tests https://github.com/microsoft/vscode-pwa/issues/28
    if (process.env.RETRY_TESTS) {
        runner.retries(Number(process.env.RETRY_TESTS));
    }
    if (process.env.FRAMEWORK_TESTS) {
        runner.addFile(path_1.join(__dirname, 'framework/reactTest'));
    }
    else {
        runner.addFile(path_1.join(__dirname, 'testIntegrationUtils'));
        runner.addFile(path_1.join(__dirname, 'infra/infra'));
        runner.addFile(path_1.join(__dirname, 'breakpoints/breakpointsTest'));
        runner.addFile(path_1.join(__dirname, 'browser/framesTest'));
        runner.addFile(path_1.join(__dirname, 'browser/browserPathResolverTest'));
        runner.addFile(path_1.join(__dirname, 'browser/blazorSourcePathResolverTest'));
        runner.addFile(path_1.join(__dirname, 'evaluate/evaluate'));
        runner.addFile(path_1.join(__dirname, 'sources/sourcesTest'));
        runner.addFile(path_1.join(__dirname, 'stacks/stacksTest'));
        runner.addFile(path_1.join(__dirname, 'threads/threadsTest'));
        runner.addFile(path_1.join(__dirname, 'variables/variablesTest'));
        runner.addFile(path_1.join(__dirname, 'console/consoleFormatTest'));
        runner.addFile(path_1.join(__dirname, 'console/consoleAPITest'));
        const options = { cwd: __dirname };
        const files = glob.sync('**/*.test.js', options);
        // Only run tests on supported platforms
        // https://nodejs.org/api/process.html#process_process_platform
        if (process.platform === 'win32') {
            files.push(...glob.sync('**/*.test.win.js', options));
        }
        for (const file of files) {
            runner.addFile(path_1.join(__dirname, file));
        }
    }
    try {
        await new Promise((resolve, reject) => runner.run(failures => failures ? reject(new Error(`${failures} tests failed`)) : resolve(undefined)));
    }
    finally {
        if (nyc) {
            nyc.writeCoverageFile();
            await nyc.report();
        }
    }
}
exports.run = run;
//# sourceMappingURL=testRunner.js.map
//# sourceMappingURL=testRunner.js.map
