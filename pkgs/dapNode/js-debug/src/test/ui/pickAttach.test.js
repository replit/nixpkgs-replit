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
const chai_1 = require("chai");
const child_process_1 = require("child_process");
const del_1 = __importDefault(require("del"));
const fs_1 = require("fs");
const os_1 = require("os");
const path = __importStar(require("path"));
const sinon_1 = require("sinon");
const split2_1 = __importDefault(require("split2"));
const vscode = __importStar(require("vscode"));
const findOpenPort_1 = require("../../common/findOpenPort");
const fsUtils_1 = require("../../common/fsUtils");
const pathUtils_1 = require("../../common/pathUtils");
const promiseUtil_1 = require("../../common/promiseUtil");
const configuration_1 = require("../../configuration");
const processPicker_1 = require("../../ui/processPicker");
const createFileTree_1 = require("../createFileTree");
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('pick and attach', () => {
    const testDir = path.join(os_1.tmpdir(), 'js-debug-pick-and-attach');
    let child;
    let sandbox;
    let port;
    let attached = false;
    beforeEach(() => (sandbox = sinon_1.createSandbox()));
    afterEach(async () => {
        sandbox === null || sandbox === void 0 ? void 0 : sandbox.restore();
        child === null || child === void 0 ? void 0 : child.kill();
        await del_1.default([`${pathUtils_1.forceForwardSlashes(testDir)}/**`], {
            force: true /* delete outside cwd */,
        });
    });
    if (process.platform !== 'win32') {
        // perform these in a separate test dir so that we don't have an extra
        // package.json from the test workspace
        it('infers the working directory', async () => {
            createFileTree_1.createFileTree(testDir, {
                'foo.js': 'setInterval(() => {}, 1000)',
            });
            child = child_process_1.spawn('node', ['foo.js'], { cwd: testDir });
            const config = Object.assign(Object.assign({}, configuration_1.nodeAttachConfigDefaults), { processId: `${child.pid}:1234` });
            await processPicker_1.resolveProcessId(new fsUtils_1.LocalFsUtils(fs_1.promises), config, true);
            chai_1.expect(test_1.removePrivatePrefix(config.cwd)).to.equal(testDir);
        });
        it('adjusts to the package root', async () => {
            createFileTree_1.createFileTree(testDir, {
                'package.json': '{}',
                'nested/foo.js': 'setInterval(() => {}, 1000)',
            });
            child = child_process_1.spawn('node', ['foo.js'], { cwd: path.join(testDir, 'nested') });
            const config = Object.assign(Object.assign({}, configuration_1.nodeAttachConfigDefaults), { processId: `${child.pid}:1234` });
            await processPicker_1.resolveProcessId(new fsUtils_1.LocalFsUtils(fs_1.promises), config, true);
            chai_1.expect(test_1.removePrivatePrefix(config.cwd)).to.equal(testDir);
        });
        it('limits inference to workspace root', async () => {
            createFileTree_1.createFileTree(testDir, {
                'package.json': '{}',
                'nested/foo.js': 'setInterval(() => {}, 1000)',
            });
            const getWorkspaceFolder = sandbox.stub(vscode.workspace, 'getWorkspaceFolder');
            getWorkspaceFolder.returns({
                name: 'nested',
                index: 1,
                uri: vscode.Uri.file(path.join(testDir, 'nested')),
            });
            child = child_process_1.spawn('node', ['foo.js'], { cwd: path.join(testDir, 'nested') });
            const config = Object.assign(Object.assign({}, configuration_1.nodeAttachConfigDefaults), { processId: `${child.pid}:1234` });
            await processPicker_1.resolveProcessId(new fsUtils_1.LocalFsUtils(fs_1.promises), config, true);
            chai_1.expect(test_1.removePrivatePrefix(config.cwd)).to.equal(path.join(testDir, 'nested'));
        });
    }
    describe('', () => {
        beforeEach(async () => {
            port = await findOpenPort_1.findOpenPort();
            child = child_process_1.spawn('node', ['--inspect-brk', `--inspect-port=${port}`], { stdio: 'pipe' });
            child.on('error', console.error);
            child
                .stderr.pipe(split2_1.default())
                .on('data', (line) => (attached = attached || line.includes('Debugger attached')));
        });
        it('end to end', async function () {
            this.timeout(30 * 1000);
            const createQuickPick = sandbox.spy(vscode.window, 'createQuickPick');
            vscode.commands.executeCommand("extension.pwa-node-debug.attachNodeProcess" /* AttachProcess */);
            await promiseUtil_1.delay(2000);
            const picker = await testIntegrationUtils_1.eventuallyOk(() => {
                chai_1.expect(createQuickPick.called).to.be.true;
                return createQuickPick.getCall(0).returnValue;
            }, 10 * 1000);
            await promiseUtil_1.delay(2000);
            const item = await testIntegrationUtils_1.eventuallyOk(() => {
                const i = picker.items.find(item => item.pidAndPort === `${child.pid}:${port}`);
                if (!i) {
                    throw new Error('expected quickpick to have item');
                }
                return i;
            }, 10 * 1000);
            picker.selectedItems = [item];
            await promiseUtil_1.delay(2000);
            await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
            await promiseUtil_1.delay(2000);
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(attached).to.equal(true, 'expected to have attached'), 10 * 1000);
        });
        it('works without a defined workspace', async () => {
            vscode.debug.startDebugging(undefined, {
                type: "pwa-node" /* Node */,
                request: 'attach',
                name: 'attach',
                processId: `${child.pid}:${port}`,
            });
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(attached).to.equal(true, 'expected to have attached'), 10 * 1000);
        });
    });
});
//# sourceMappingURL=pickAttach.test.js.map
//# sourceMappingURL=pickAttach.test.js.map
