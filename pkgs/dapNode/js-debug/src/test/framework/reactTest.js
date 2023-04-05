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
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path_1 = require("path");
const logger_1 = require("../../common/logging/logger");
const promiseUtil_1 = require("../../common/promiseUtil");
const killTree_1 = require("../../targets/node/killTree");
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('react', () => {
    async function waitForPause(p, cb) {
        const { threadId } = p.log(await p.dap.once('stopped'));
        await p.logger.logStackTrace(threadId);
        if (cb)
            await cb(threadId);
        return p.dap.continue({ threadId });
    }
    const projectName = 'react-test';
    let projectFolder;
    let devServerProc;
    afterEach(() => {
        if (devServerProc) {
            console.log('Killing ' + devServerProc.pid);
            killTree_1.killTree(devServerProc.pid, logger_1.Logger.null);
        }
    });
    describe('TS', () => {
        beforeEach(async function () {
            this.timeout(60000 * 4);
            projectFolder = path_1.join(test_1.testFixturesDir, projectName);
            await setupCRA(projectName, test_1.testFixturesDir, ['--template', 'cra-template-typescript']);
            devServerProc = await startDevServer(projectFolder);
        });
        testIntegrationUtils_1.itIntegrates('hit breakpoint', async ({ r }) => {
            // Breakpoint in inline script set before launch.
            const p = await r._launch('http://localhost:3000', {
                webRoot: projectFolder,
                __workspaceFolder: projectFolder,
                rootPath: projectFolder,
            });
            const source = {
                path: path_1.join(projectFolder, 'src/App.tsx'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6, column: 0 }] });
            p.load();
            await waitForPause(p);
            p.assertLog({ substring: true });
        });
    });
    describe('JS', () => {
        beforeEach(async function () {
            this.timeout(60000 * 4);
            projectFolder = path_1.join(test_1.testFixturesDir, projectName);
            await setupCRA(projectName, test_1.testFixturesDir);
            devServerProc = await startDevServer(projectFolder);
        });
        testIntegrationUtils_1.itIntegrates('hit breakpoint', async ({ r }) => {
            // Breakpoint in inline script set before launch.
            const p = await r._launch('http://localhost:3000', {
                webRoot: projectFolder,
                __workspaceFolder: projectFolder,
                rootPath: projectFolder,
            });
            const source = {
                path: path_1.join(projectFolder, 'src/App.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6, column: 0 }] });
            p.load();
            await waitForPause(p);
            p.assertLog({ substring: true });
        });
    });
});
async function setupCRA(projectName, cwd, args = []) {
    console.log('Setting up CRA in ' + cwd);
    fs.mkdirSync(cwd, { recursive: true });
    const setupProc = cp.spawn('npx', ['create-react-app', ...args, projectName], {
        cwd,
        stdio: 'pipe',
        env: process.env,
    });
    setupProc.stdout.on('data', d => console.log(d.toString().replace(/\r?\n$/, '')));
    setupProc.stderr.on('data', d => console.error(d.toString().replace(/\r?\n$/, '')));
    const done = promiseUtil_1.getDeferred();
    setupProc.once('exit', () => {
        done.resolve(undefined);
    });
    await done.promise;
}
async function startDevServer(projectFolder) {
    const devServerListening = promiseUtil_1.getDeferred();
    const devServerProc = cp.spawn('npm', ['run-script', 'start'], {
        env: Object.assign(Object.assign({}, process.env), { BROWSER: 'none', SKIP_PREFLIGHT_CHECK: 'true' }),
        cwd: projectFolder,
        stdio: 'pipe',
    });
    const timer = setTimeout(() => {
        console.log('Did not get recognized dev server output, continuing');
        devServerListening.resolve(undefined);
    }, 10000);
    devServerProc.stdout.on('data', d => {
        d = d.toString();
        if (d.includes('You can now view')) {
            console.log('Detected CRA dev server started');
            devServerListening.resolve(undefined);
        }
        else if (d.includes('Something is already')) {
            devServerListening.reject(new Error('Failed to start the dev server: ' + d));
        }
        console.log(d.toString().replace(/\r?\n$/, ''));
    });
    devServerProc.stderr.on('data', d => console.error(d.toString().replace(/\r?\n$/, '')));
    await devServerListening.promise;
    clearTimeout(timer);
    return devServerProc;
}
//# sourceMappingURL=reactTest.js.map
//# sourceMappingURL=reactTest.js.map
