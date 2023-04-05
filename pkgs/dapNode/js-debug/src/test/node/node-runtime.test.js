"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const sinon_1 = require("sinon");
const split2_1 = __importDefault(require("split2"));
const environmentVars_1 = require("../../common/environmentVars");
const findOpenPort_1 = require("../../common/findOpenPort");
const objUtils_1 = require("../../common/objUtils");
const pathUtils_1 = require("../../common/pathUtils");
const promiseUtil_1 = require("../../common/promiseUtil");
const configuration_1 = require("../../configuration");
const terminalProgramLauncher_1 = require("../../targets/node/terminalProgramLauncher");
const createFileTree_1 = require("../createFileTree");
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('node runtime', () => {
    async function waitForPause(p) {
        const { threadId } = p.log(await p.dap.once('stopped'));
        await p.logger.logStackTrace(threadId);
        return p.dap.continue({ threadId });
    }
    async function evaluate(handle, expression) {
        handle.load();
        const { threadId } = handle.log(await handle.dap.once('stopped'));
        const stack = await handle.dap.stackTrace({ threadId });
        await handle.logger.evaluateAndLog(expression, {
            params: {
                frameId: stack.stackFrames[0].id,
            },
        });
        handle.assertLog();
    }
    function assertSkipFiles(expectedStacktrace) {
        const stackframes = expectedStacktrace.trim().split('\n');
        chai_1.expect(stackframes.length).to.be.greaterThan(0);
        chai_1.expect(stackframes[0]).to.not.contain('<hidden: Skipped by skipFiles>');
        for (let n = 1; n < stackframes.length; n++) {
            chai_1.expect(stackframes[n]).to.contain('<hidden: Skipped by skipFiles>');
        }
    }
    describe('skipFiles', () => {
        testIntegrationUtils_1.itIntegrates('skipFiles skip node internals', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'), {
                skipFiles: ['<node_internals>/**'],
            });
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'index.js') },
                breakpoints: [{ line: 1, column: 1 }],
            });
            handle.load();
            const stoppedParams = await handle.dap.once('stopped');
            await promiseUtil_1.delay(200); // need to pause test to let debouncer update scripts
            await handle.logger.logStackTrace(stoppedParams.threadId, false);
            handle.assertLog({ customAssert: assertSkipFiles });
        });
        for (const [name, useDelay] of [
            ['with delay', true],
            ['without delay', false],
        ]) {
            describe(name, () => {
                for (const fn of ['caughtInUserCode', 'uncaught', 'caught', 'rethrown']) {
                    testIntegrationUtils_1.itIntegrates(fn, async ({ r }) => {
                        await r.initialize;
                        const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
                        const handle = await r.runScript(path_1.join(cwd, 'skipFiles.js'), {
                            args: [useDelay ? '1000' : '0', fn],
                            skipFiles: ['**/skippedScript.js'],
                        });
                        await handle.dap.setExceptionBreakpoints({
                            filters: ['all', 'uncaught'],
                        });
                        handle.dap.on('output', o => handle.logger.logOutput(o));
                        handle.dap.on('stopped', async (o) => {
                            await handle.logger.logStackTrace(o.threadId, false);
                            await handle.dap.continue({ threadId: o.threadId });
                        });
                        handle.load();
                        await handle.dap.once('terminated');
                        handle.assertLog({ substring: true });
                    });
                }
            });
        }
    });
    testIntegrationUtils_1.itIntegrates('simple script', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': ['console.log("hello world");', 'debugger;'] });
        const handle = await r.runScript('test.js');
        handle.load();
        await waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('chakracore string value', async ({ r }) => {
        if (process.platform !== 'win32') {
            return;
        }
        createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'test.js': ['const message = "hello world!";', 'console.log(message);', 'debugger;'],
        });
        const chakracore = path_1.join(test_1.testWorkspace, 'chakracore', 'ChakraCore.Debugger.Sample.exe');
        const handle = await r.runScript('test.js', {
            runtimeExecutable: chakracore,
            runtimeArgs: ['--inspect-brk', '--port', '9229'],
            attachSimplePort: 9229,
            continueOnAttach: true,
        });
        handle.load();
        const { threadId } = handle.log(await handle.dap.once('stopped'));
        handle.dap.continue({ threadId });
        await handle.dap.once('stopped');
        const stack = await handle.dap.stackTrace({ threadId });
        await handle.logger.evaluateAndLog('message', {
            params: {
                frameId: stack.stackFrames[0].id,
            },
        });
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('exits with child process launcher', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': '' });
        const handle = await r.runScript('test.js', { console: 'internalConsole' });
        handle.load();
        await handle.dap.once('terminated');
    });
    if (process.env.ONLY_MINSPEC !== 'true') {
        // not available on node 8
        testIntegrationUtils_1.itIntegrates('debugs worker threads', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': [
                    'const { Worker, isMainThread, workerData } = require("worker_threads");',
                    'if (isMainThread) {',
                    '  new Worker(__filename, { workerData: { greet: "world" } });',
                    '} else {',
                    '  setInterval(() => {',
                    '    console.log("hello " + workerData.greet);',
                    '   }, 100);',
                    '}',
                ],
            });
            const handle = await r.runScript('test.js');
            handle.load();
            const worker = await r.worker();
            await worker.dap.setBreakpoints({
                source: { path: path_1.join(test_1.testFixturesDir, 'test.js') },
                breakpoints: [{ line: 6, column: 1 }],
            });
            worker.load();
            await waitForPause(worker);
            handle.assertLog({ substring: true });
        });
    }
    testIntegrationUtils_1.itIntegrates('exits with integrated terminal launcher', async ({ r }) => {
        // We don't actually attach the DAP fully through vscode, so stub about
        // the launch request. We just want to test that the lifecycle of a detached
        // process is handled correctly.
        const launch = sinon_1.stub(terminalProgramLauncher_1.TerminalProgramLauncher.prototype, 'sendLaunchRequest');
        after(() => launch.restore());
        let receivedRequest;
        launch.callsFake((request) => {
            receivedRequest = request;
            child_process_1.spawn(request.args[0], request.args.slice(1), {
                cwd: request.cwd,
                env: Object.assign(Object.assign({}, process.env), request.env),
            });
            return Promise.resolve({});
        });
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': '' });
        const handle = await r.runScript('test.js', {
            console: 'integratedTerminal',
            cwd: test_1.testFixturesDir,
            env: { myEnv: 'foo' },
        });
        handle.load();
        await handle.dap.once('terminated');
        chai_1.expect(receivedRequest).to.containSubset({
            title: 'Test Case',
            kind: 'integrated',
            cwd: test_1.testFixturesDir,
            env: { myEnv: 'foo' },
        });
    });
    testIntegrationUtils_1.itIntegrates('adjusts to compiles file if it exists', async ({ r }) => {
        await r.initialize;
        const handle = await r.runScript(path_1.join(test_1.testWorkspace, 'web/basic.ts'));
        await handle.dap.setBreakpoints({
            source: { path: handle.workspacePath('web/basic.ts') },
            breakpoints: [{ line: 21, column: 0 }],
        });
        handle.load();
        await waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    describe('inspect flag handling', () => {
        testIntegrationUtils_1.itIntegrates('does not break with inspect flag', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': ['console.log("hello world");', 'debugger;'] });
            const handle = await r.runScript('test.js', {
                runtimeArgs: ['--inspect'],
            });
            handle.load();
            await waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('treats inspect-brk as stopOnEntry', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': ['console.log("hello world");'] });
            const handle = await r.runScript('test.js', {
                cwd: test_1.testFixturesDir,
                runtimeArgs: ['--inspect-brk'],
            });
            handle.load();
            await waitForPause(handle);
            handle.assertLog({ substring: true });
        });
    });
    describe('stopOnEntry', () => {
        beforeEach(() => createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'test.js': ['let i = 0;', 'i++;', 'i++;'],
            'bar.js': 'require("./test")',
        }));
        testIntegrationUtils_1.itIntegrates('stops with a breakpoint elsewhere (#515)', async ({ r }) => {
            const handle = await r.runScript('test.js', {
                cwd: test_1.testFixturesDir,
                stopOnEntry: true,
            });
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(test_1.testFixturesDir, 'test.js') },
                breakpoints: [{ line: 3, column: 1 }],
            });
            handle.load();
            await waitForPause(handle);
            r.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('stops with a program provided', async ({ r }) => {
            const handle = await r.runScript('test.js', {
                cwd: test_1.testFixturesDir,
                stopOnEntry: true,
            });
            handle.load();
            await waitForPause(handle);
            r.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('launches and infers entry from args', async ({ r }) => {
            const handle = await r.runScript('test.js', {
                cwd: test_1.testFixturesDir,
                args: ['--max-old-space-size=1024', 'test.js', '--not-a-file'],
                program: undefined,
                stopOnEntry: true,
            });
            handle.load();
            await waitForPause(handle);
            r.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('sets an explicit stop on entry point', async ({ r }) => {
            const handle = await r.runScript('bar.js', {
                cwd: test_1.testFixturesDir,
                stopOnEntry: path_1.join(test_1.testFixturesDir, 'test.js'),
            });
            handle.load();
            await waitForPause(handle);
            r.assertLog({ substring: true });
        });
    });
    describe('attaching', () => {
        let child;
        afterEach(() => {
            if (child) {
                child.kill();
            }
        });
        testIntegrationUtils_1.itIntegrates('attaches to existing processes', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': ['setInterval(() => { debugger; }, 500)'],
            });
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')]);
            await promiseUtil_1.delay(500); // give it a moment to boot
            const handle = await r.attachNode(child.pid);
            await waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        // todo(connor4312): I'm having a really hard time getting this to pass. I
        // think there might be funky with out test setup, works fine running manually.
        testIntegrationUtils_1.itIntegrates.skip('continueOnAttach', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': ['console.log("");', 'debugger;'],
            });
            child = child_process_1.spawn('node', ['--inspect-brk', path_1.join(test_1.testFixturesDir, 'test')]);
            const handle = await r.attachNode(0, { continueOnAttach: true });
            await waitForPause(handle); // pauses on 2nd line, not 1st
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('retries attachment', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': ['setInterval(() => { debugger; }, 500)'],
            });
            const handleProm = r.attachNode(0, { port: 9229 });
            await promiseUtil_1.delay(500); // give it a moment to start trying to attach
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')]);
            const handle = await handleProm;
            await waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('attaches children of child processes', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': `
          const { spawn } = require('child_process');
          setInterval(() => spawn('node', ['child'], { cwd: __dirname }), 500);
        `,
                'child.js': '(function foo() { debugger; })();',
            });
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')]);
            await promiseUtil_1.delay(500); // give it a moment to boot
            const handle = await r.attachNode(child.pid);
            handle.load();
            const worker = await r.worker();
            worker.load();
            await waitForPause(worker);
            worker.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('attaches to cluster processes', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': `
          const cluster = require('cluster');
          if (cluster.isMaster) {
            cluster.fork();
          } else {
            setInterval(() => { debugger; }, 500);
          }
        `,
            });
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')]);
            await promiseUtil_1.delay(500); // give it a moment to boot
            const handle = await r.attachNode(child.pid);
            handle.load();
            const worker = await r.worker();
            worker.load();
            await waitForPause(worker);
            worker.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('restarts if requested', async ({ r }) => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': ['setInterval(() => { debugger; }, 100)'],
            });
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')]);
            const handle = await r.attachNode(0, { port: 9229, restart: true });
            handle.log(await handle.dap.once('stopped'));
            await handle.dap.evaluate({ expression: 'process.exit(0)' });
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')]);
            const reconnect = await r.waitForTopLevel();
            reconnect.load();
            await waitForPause(reconnect);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('does not restart if killed', async ({ r }) => {
            var _a;
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'test.js': ['setInterval(() => { debugger; }, 100)'],
            });
            child = child_process_1.spawn('node', ['--inspect', path_1.join(test_1.testFixturesDir, 'test')], { stdio: 'pipe' });
            const lines = [];
            (_a = child.stderr) === null || _a === void 0 ? void 0 : _a.pipe(split2_1.default()).on('data', line => lines.push(line));
            const handle = await r.attachNode(0, { port: 9229, restart: true });
            await handle.dap.once('stopped');
            await r.rootDap().disconnect({});
            await promiseUtil_1.delay(1000);
            chai_1.expect(lines.filter(l => l.includes('Debugger attached'))).to.have.lengthOf(1);
        });
    });
    describe('child processes', () => {
        beforeEach(() => createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'test.js': `
        const cp = require('child_process');
        const path = require('path');
        cp.fork(path.join(__dirname, 'child.js'));
      `,
            'child.js': `
        const foo = 'It works!';
        debugger;
      `,
        }));
        testIntegrationUtils_1.itIntegrates('debugs', async ({ r }) => {
            const handle = await r.runScript('test.js');
            handle.load();
            const worker = await r.worker();
            worker.load();
            const { threadId } = worker.log(await worker.dap.once('stopped'));
            const stack = await worker.dap.stackTrace({ threadId });
            await worker.logger.evaluateAndLog('foo', {
                params: {
                    frameId: stack.stackFrames[0].id,
                },
            });
            worker.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('does not debug if auto attach off', async ({ r }) => {
            const handle = await r.runScript('test.js', { autoAttachChildProcesses: false });
            handle.load();
            const result = await Promise.race([
                r.worker(),
                new Promise(r => setTimeout(() => r('ok'), 1000)),
            ]);
            chai_1.expect(result).to.equal('ok');
        });
    });
    testIntegrationUtils_1.itIntegrates('sets arguments', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': 'debugger' });
        const handle = await r.runScript('test.js', {
            args: ['--some', 'very fancy', '--arguments'],
        });
        await evaluate(handle, 'process.argv.slice(2)');
    });
    testIntegrationUtils_1.itIntegrates('sets the cwd', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': 'debugger' });
        const handle = await r.runScript('test.js', {
            cwd: test_1.testWorkspace,
        });
        await evaluate(handle, 'process.cwd()');
    });
    testIntegrationUtils_1.itIntegrates('sets sourceMapOverrides from the cwd', async ({ r }) => {
        const handle = await r.runScript(path_1.join(test_1.testWorkspace, 'simpleNode', 'simpleWebpack.js'), {
            cwd: path_1.join(test_1.testWorkspace, 'simpleNode'),
        });
        handle.load();
        await waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('sets environment variables', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': 'debugger' });
        const handle = await r.runScript('test.js', {
            env: {
                HELLO: 'world',
            },
        });
        await evaluate(handle, 'process.env.HELLO');
    });
    testIntegrationUtils_1.itIntegrates('sets environment variables', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': 'debugger' });
        const handle = await r.runScript('test.js', {
            env: {
                HELLO: 'world',
            },
        });
        await evaluate(handle, 'process.env.HELLO');
    });
    testIntegrationUtils_1.itIntegrates('reads the envfile', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'test.js': 'debugger;',
            vars: ['A=foo', 'B=bar'],
        });
        environmentVars_1.EnvironmentVars.processEnv.forget();
        const previousC = process.env.C;
        process.env.C = 'inherited';
        const handle = await r.runScript('test.js', {
            envFile: path_1.join(test_1.testFixturesDir, 'vars'),
            env: {
                B: 'overwritten',
            },
        });
        await evaluate(handle, 'JSON.stringify({ a: process.env.A, b: process.env.B, c: process.env.C })');
        process.env.C = previousC;
        environmentVars_1.EnvironmentVars.processEnv.forget();
    });
    testIntegrationUtils_1.itIntegrates('writes errors if runtime executable not found', async ({ r }) => {
        await r.initialize;
        const result = await r.rootDap().launch(Object.assign(Object.assign({}, configuration_1.nodeLaunchConfigDefaults), { cwd: path_1.dirname(test_1.testFixturesDir), program: path_1.join(test_1.testFixturesDir, 'test.js'), rootPath: test_1.testWorkspace, runtimeExecutable: 'does-not-exist', __workspaceFolder: test_1.testFixturesDir }));
        chai_1.expect(result).to.include('Can\'t find Node.js binary "does-not-exist"');
    });
    testIntegrationUtils_1.itIntegrates('scripts with http urls', async ({ r }) => {
        await r.initialize;
        const cwd = path_1.join(test_1.testWorkspace, 'web', 'urlSourcemap');
        const handle = await r.runScript(path_1.join(cwd, 'index.js'), {
            cwd: test_1.testWorkspace,
            skipFiles: ['<node_internals>/**'],
            sourceMapPathOverrides: { 'http://localhost:8001/*': `${test_1.testWorkspace}/web/*` },
        });
        handle.load();
        await waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('gets performance information', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, { 'test.js': 'setInterval(() => {}, 1000)' });
        const handle = await r.runScript('test.js');
        await handle.load();
        const res = await handle.dap.getPerformance({});
        chai_1.expect(res.error).to.be.undefined;
        chai_1.expect(res.metrics).to.not.be.empty;
    });
    describe('simplePortAttach', () => {
        const npm = objUtils_1.once(async () => {
            const npmPath = await pathUtils_1.findInPath(fs_1.promises, 'npm', process.env);
            if (!npmPath) {
                throw new Error('npm not on path');
            }
            return npmPath;
        });
        testIntegrationUtils_1.itIntegrates('allows inspect-brk in npm scripts', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const handle = await r.runScript('', {
                program: undefined,
                cwd,
                runtimeExecutable: await npm(),
                runtimeArgs: ['run', 'startWithBrk'],
                port: 29204,
            });
            const optionsOut = handle.dap.once('output', o => o.output.includes('NODE_OPTIONS'));
            handle.load();
            const { threadId } = handle.log(await handle.dap.once('stopped'));
            handle.dap.continue({ threadId });
            handle.logger.logOutput(await optionsOut);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('uses bootloader for normal npm scripts', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            r.onSessionCreated(t => t.load());
            const handle = await r.runScript('', {
                program: undefined,
                cwd,
                runtimeExecutable: await npm(),
                runtimeArgs: ['run', 'startWithoutBrk'],
                port: 29204,
            });
            handle.load();
            const worker = await r.worker();
            const optionsOut = worker.dap.once('output', o => o.output.includes('NODE_OPTIONS'));
            handle.logger.logOutput(await optionsOut);
            handle.assertLog({ customAssert: l => chai_1.expect(l).to.contain('NODE_OPTIONS= --require') });
        });
        testIntegrationUtils_1.itIntegrates('allows simple port attachment', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const port = await findOpenPort_1.findOpenPort();
            const handle = await r.runScript(path_1.join(cwd, 'logNodeOptions'), {
                runtimeArgs: [`--inspect-brk=${port}`],
                attachSimplePort: port,
            });
            handle.load();
            const optionsOut = handle.dap.once('output', o => o.output.includes('NODE_OPTIONS'));
            const { threadId } = handle.log(await handle.dap.once('stopped'));
            handle.dap.continue({ threadId });
            handle.logger.logOutput(await optionsOut);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('terminates when inspector closed', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const port = await findOpenPort_1.findOpenPort();
            const handle = await r.runScript(path_1.join(cwd, 'debuggerStmt'), {
                runtimeArgs: [`--inspect-brk=${port}`],
                attachSimplePort: port,
            });
            handle.load();
            handle.log(await handle.dap.once('stopped'));
            handle.dap.evaluate({ expression: 'require("inspector").close()' });
            handle.log(await handle.dap.once('terminated'));
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('terminates when process killed', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const port = await findOpenPort_1.findOpenPort();
            const handle = await r.runScript(path_1.join(cwd, 'debuggerStmt'), {
                runtimeArgs: [`--inspect-brk=${port}`],
                attachSimplePort: port,
            });
            handle.load();
            handle.log(await handle.dap.once('stopped'));
            handle.dap.evaluate({ expression: 'process.exit(1)' });
            handle.log(await handle.dap.once('terminated'));
            handle.assertLog({ substring: true });
        });
    });
});
//# sourceMappingURL=node-runtime.test.js.map
//# sourceMappingURL=node-runtime.test.js.map
