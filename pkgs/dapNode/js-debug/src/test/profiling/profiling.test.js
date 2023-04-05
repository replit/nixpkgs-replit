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
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
const chai_1 = require("chai");
const path_1 = require("path");
const fs_1 = require("fs");
const promiseUtil_1 = require("../../common/promiseUtil");
const sinon_1 = require("sinon");
const vscode = __importStar(require("vscode"));
const contributionUtils_1 = require("../../common/contributionUtils");
const events_1 = require("../../common/events");
const disposable_1 = require("../../common/disposable");
describe('profiling', () => {
    const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
    const script = path_1.join(cwd, 'profilePlayground.js');
    let createQuickPick;
    let acceptQuickPick;
    const assertValidOutputFile = async (file) => {
        const contents = await fs_1.promises.readFile(file, 'utf-8');
        chai_1.expect(() => JSON.parse(contents)).to.not.throw(undefined, 'expected to be valid JSON: ' + contents);
    };
    const getFrameId = async (threadId, handle) => (await handle.dap.stackTrace({ threadId })).stackFrames[0].id;
    beforeEach(() => {
        const original = vscode.window.createQuickPick;
        createQuickPick = sinon_1.stub(vscode.window, 'createQuickPick').callsFake(() => {
            const picker = original();
            acceptQuickPick = new events_1.EventEmitter();
            sinon_1.stub(picker, 'onDidAccept').callsFake(acceptQuickPick.event);
            return picker;
        });
    });
    afterEach(() => {
        createQuickPick.restore();
    });
    testIntegrationUtils_1.itIntegrates('cpu sanity test', async ({ r }) => {
        await r.initialize;
        const handle = await r.runScript(script);
        handle.load();
        const startedEvent = handle.dap.once('profileStarted');
        await handle.dap.startProfile({ type: 'cpu' });
        await promiseUtil_1.delay(300);
        await handle.dap.stopProfile({});
        await assertValidOutputFile((await startedEvent).file);
    });
    describe('breakpoints', () => {
        testIntegrationUtils_1.itIntegrates('continues if was paused on start', async ({ r }) => {
            await r.initialize;
            const handle = await r.runScript(script);
            await handle.load();
            handle.log(await handle.dap.setBreakpoints({
                source: { path: script },
                breakpoints: [{ line: 21, column: 1 }],
            }));
            handle.log(await handle.dap.once('stopped'));
            const continued = handle.dap.once('continued');
            const output = handle.dap.once('output');
            await handle.dap.startProfile({ type: 'cpu' });
            handle.log(await continued);
            handle.log(await output); // make sure it *actually* continued
            handle.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('continues if was paused on start with debugger domain', async ({ r }) => {
            await r.initialize;
            const handle = await r.runScript(script);
            await handle.load();
            handle.log(await handle.dap.setBreakpoints({
                source: { path: script },
                breakpoints: [{ line: 21, column: 1 }],
            }));
            handle.log(await handle.dap.once('stopped'));
            const continued = handle.dap.once('continued');
            const output = handle.dap.once('output');
            await handle.dap.startProfile({ type: 'cpu', stopAtBreakpoint: [-1] });
            handle.log(await continued);
            handle.log(await output); // make sure it *actually* continued
            handle.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('unverifies and reverifies', async ({ r }) => {
            await r.initialize;
            const handle = await r.runScript(script);
            await handle.load();
            handle.log(await handle.dap.setBreakpoints({
                source: { path: script },
                breakpoints: [{ line: 6, column: 1 }],
            }), undefined, []);
            await promiseUtil_1.delay(0);
            const logfn = sinon_1.stub().callsFake(data => handle.log(data, undefined, []));
            handle.dap.on('breakpoint', logfn);
            await handle.dap.startProfile({ type: 'cpu' });
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(logfn.callCount).to.gte(1), 2000);
            await handle.dap.stopProfile({});
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(logfn.callCount).to.gte(2), 2000);
            handle.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('does not unverify target breakpoint', async ({ r }) => {
            await r.initialize;
            const handle = await r.runScript(script);
            await handle.load();
            const { breakpoints } = handle.log(await handle.dap.setBreakpoints({
                source: { path: script },
                breakpoints: [
                    { line: 6, column: 1 },
                    { line: 17, column: 1 },
                ],
            }), undefined, []);
            await promiseUtil_1.delay(0);
            const logfn = sinon_1.stub().callsFake(data => handle.log(data, undefined, []));
            handle.dap.on('breakpoint', logfn);
            await handle.dap.startProfile({
                type: 'cpu',
                stopAtBreakpoint: [breakpoints[1].id],
            });
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(logfn.callCount).to.gte(1));
            await handle.dap.stopProfile({});
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(logfn.callCount).to.gte(2));
            handle.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('runs until a breakpoint is hit', async ({ r }) => {
            await r.initialize;
            const handle = await r.runScript(script);
            const { breakpoints } = await handle.dap.setBreakpoints({
                source: { path: script },
                breakpoints: [
                    { line: 20, column: 1 },
                    { line: 17, column: 1 },
                ],
            });
            await handle.load();
            const startedEvent = handle.dap.once('profileStarted');
            // Wait for the pause, and call noop after a second which will hit the BP
            const stopped = await handle.dap.once('stopped');
            await handle.dap.evaluate({
                expression: 'setTimeout(noop, 1000)',
                context: 'repl',
                frameId: await getFrameId(stopped.threadId, handle),
            });
            // Start a profile
            await handle.dap.startProfile({
                type: 'cpu',
                stopAtBreakpoint: [breakpoints[1].id],
            });
            // We should hit the breakpoint, stop the profile, and re-verify the first breakpoint.
            const paused = handle.dap.once('stopped');
            const profileFinished = handle.dap.once('profilerStateUpdate');
            const breakpointReenabled = handle.dap.once('breakpoint', evt => evt.breakpoint.id === breakpoints[0].id && evt.breakpoint.verified);
            handle.log(await paused, 'paused event');
            handle.log(await profileFinished, 'finished profile');
            handle.log(await breakpointReenabled, 'reenabled breakpoint', []);
            await assertValidOutputFile((await startedEvent).file);
            handle.assertLog();
        });
    });
    describe('ui', () => {
        afterEach(async () => {
            await vscode.debug.stopDebugging();
        });
        const pickTermination = async (session, labelRe) => {
            vscode.commands.executeCommand("extension.js-debug.startProfile" /* StartProfile */, session.id);
            // we skip this step while "cpu" is the only profile:
            // const typePicker = await eventuallyOk(() => {
            //   expect(createQuickPick.callCount).to.equal(1);
            //   const picker: vscode.QuickPick<vscode.QuickPickItem> = createQuickPick.getCall(0)
            //     .returnValue;
            //   expect(picker.items).to.not.be.empty;
            //   return picker;
            // }, 2000);
            // typePicker.selectedItems = typePicker.items.filter(i => /CPU/i.test(i.label));
            // acceptQuickPick.fire();
            const terminationPicker = await testIntegrationUtils_1.eventuallyOk(() => {
                // expect(createQuickPick.callCount).to.equal(2);
                chai_1.expect(createQuickPick.callCount).to.equal(1);
                const picker = createQuickPick.getCall(0)
                    .returnValue;
                chai_1.expect(picker.items).to.not.be.empty;
                return picker;
            }, 2000);
            terminationPicker.selectedItems = terminationPicker.items.filter(i => labelRe.test(i.label));
            acceptQuickPick.fire();
        };
        // todo: renable after 1.49, fails in CI right now
        it.skip('allows picking breakpoints', async () => {
            vscode.debug.addBreakpoints([
                new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(script), new vscode.Position(19, 0))),
                new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(script), new vscode.Position(5, 0))),
                new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(script + '.foo'), new vscode.Position(0, 0))),
            ]);
            after(() => {
                vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
            });
            vscode.debug.startDebugging(undefined, {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'test',
                program: script,
            });
            const session = await new Promise(resolve => vscode.debug.onDidStartDebugSession(s => '__pendingTargetId' in s.configuration ? resolve(s) : undefined));
            await pickTermination(session, /breakpoint/i);
            const breakpointPicker = await testIntegrationUtils_1.eventuallyOk(() => {
                chai_1.expect(createQuickPick.callCount).to.equal(2);
                const picker = createQuickPick.getCall(1)
                    .returnValue;
                chai_1.expect(picker.items.length).to.be.greaterThan(0, 'expected to have picker items');
                return picker;
            }, 5000);
            chai_1.expect(breakpointPicker.items).to.containSubset([
                {
                    description: 'for (let i = 0; i < 10; i++) {',
                    label: 'testWorkspace/simpleNode/profilePlayground.js:6:16',
                },
                {
                    description: 'setInterval(() => {',
                    label: 'testWorkspace/simpleNode/profilePlayground.js:20:1',
                },
            ]);
            breakpointPicker.dispose();
        });
        it('sets substate correctly', async () => {
            const disposable = new disposable_1.DisposableList();
            disposable.push(vscode.commands.registerCommand('js-debug.test.callback', () => undefined));
            vscode.debug.startDebugging(undefined, {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'test',
                program: script,
            });
            const session = await new Promise(resolve => vscode.debug.onDidStartDebugSession(s => '__pendingTargetId' in s.configuration ? resolve(s) : undefined));
            await contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.startProfile" /* StartProfile */, {
                sessionId: session.id,
                type: 'cpu',
                termination: { type: 'manual' },
            });
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(session.name).to.contain('Profiling'), 2000);
            await contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.stopProfile" /* StopProfile */, session.id);
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(session.name).to.not.contain('Profiling'), 2000);
            disposable.dispose();
        });
        it('works with pure command API', async () => {
            const callback = sinon_1.stub();
            const disposable = new disposable_1.DisposableList();
            disposable.push(vscode.commands.registerCommand('js-debug.test.callback', callback));
            vscode.debug.startDebugging(undefined, {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'test',
                program: script,
            });
            const session = await new Promise(resolve => vscode.debug.onDidStartDebugSession(s => '__pendingTargetId' in s.configuration ? resolve(s) : undefined));
            await contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.startProfile" /* StartProfile */, {
                sessionId: session.id,
                type: 'cpu',
                termination: { type: 'manual' },
                onCompleteCommand: 'js-debug.test.callback',
            });
            await promiseUtil_1.delay(1000);
            await contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.stopProfile" /* StopProfile */, session.id);
            const args = await testIntegrationUtils_1.eventuallyOk(() => {
                chai_1.expect(callback.called).to.be.true;
                return callback.getCall(0).args[0];
            }, 2000);
            chai_1.expect(() => JSON.parse(args.contents)).to.not.throw;
            chai_1.expect(args.basename).to.match(/\.cpuprofile$/);
            disposable.dispose();
        });
        it('profiles from launch', async function () {
            this.timeout(20 * 1000); // 20 seconds timeout
            vscode.debug.startDebugging(undefined, {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'test',
                program: script,
                profileStartup: true,
            });
            const session = await new Promise(resolve => vscode.debug.onDidStartDebugSession(s => '__pendingTargetId' in s.configuration ? resolve(s) : undefined));
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(session.name).to.contain('Profiling'), 2000);
            await contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.stopProfile" /* StopProfile */, session.id);
            await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(session.name).to.not.contain('Profiling'), 2000);
        });
    });
});
//# sourceMappingURL=profiling.test.js.map
//# sourceMappingURL=profiling.test.js.map
