"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const promiseUtil_1 = require("../../common/promiseUtil");
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('stacks', () => {
    async function dumpStackAndContinue(p, scopes) {
        const event = await p.dap.once('stopped');
        await p.logger.logStackTrace(event.threadId, scopes);
        await p.dap.continue({ threadId: event.threadId });
    }
    testIntegrationUtils_1.itIntegrates('eval in anonymous', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        p.cdp.Runtime.evaluate({ expression: '\n\ndebugger;\n//# sourceURL=eval.js' });
        await dumpStackAndContinue(p, false);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('anonymous initial script', async ({ r }) => {
        const p = await r.launch('<script>debugger;</script>');
        p.load();
        await dumpStackAndContinue(p, false);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('anonymous scopes', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        p.cdp.Runtime.evaluate({
            expression: `
      function paused() {
        let y = 'paused';
        debugger;
      }
      function chain(n) {
        if (!n)
          return paused;
        return function chained() {
          let x = 'x' + n;
          chain(n - 1)();
        };
      }
      chain(3)();
    `,
        });
        await dumpStackAndContinue(p, true);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('async', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        p.cdp.Runtime.evaluate({
            expression: `
      function foo(n) {
        if (!n) {
          debugger;
          return;
        }
        setTimeout(() => {
          bar(n - 1);
        }, 0);
      }
      async function bar(n) {
        await Promise.resolve(15);
        await foo(n);
      }
      bar(1);
    `,
        });
        await dumpStackAndContinue(p, true);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('async disables', async ({ r }) => {
        const p = await r.launchAndLoad('blank', { showAsyncStacks: false });
        p.cdp.Runtime.evaluate({
            expression: `
      function foo(n) {
        if (!n) {
          debugger;
          return;
        }
        setTimeout(() => {
          bar(n - 1);
        }, 0);
      }
      async function bar(n) {
        await Promise.resolve(15);
        await foo(n);
      }
      bar(1);
    `,
        });
        await dumpStackAndContinue(p, true);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('cross target', async ({ r }) => {
        const p = await r.launchUrlAndLoad('worker.html');
        p.cdp.Runtime.evaluate({ expression: `window.w.postMessage('pause')` });
        await dumpStackAndContinue(p, true);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('source map', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html');
        p.addScriptTag('browserify/pause.js');
        await dumpStackAndContinue(p, true);
        p.assertLog();
    });
    describe('smartStep', () => {
        const emptySourceMapContents = Buffer.from(JSON.stringify({
            version: 3,
            file: 'source.js',
            sourceRoot: '',
            sources: ['source.ts'],
            mappings: '',
        })).toString('base64');
        const emptySourceMap = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,` + emptySourceMapContents;
        testIntegrationUtils_1.itIntegrates('simple stepping', async ({ r }) => {
            const p = await r.launchUrlAndLoad('index.html');
            p.addScriptTag('smartStep/async.js');
            const { threadId } = await p.dap.once('stopped');
            await p.dap.next({ threadId: threadId });
            await p.dap.once('stopped');
            await p.logger.logStackTrace(threadId);
            await p.dap.stepIn({ threadId: threadId });
            await p.dap.stepIn({ threadId: threadId });
            await dumpStackAndContinue(p, false);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('remembers step direction out', async ({ r }) => {
            const p = await r.launchUrlAndLoad('index.html');
            await p.addScriptTag('smartStep/directional.js');
            await p.waitForSource('directional.ts');
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/smartStep/directional.ts') },
                breakpoints: [{ line: 2, column: 0 }],
            });
            const result = p.evaluate(`doCall(() => { mapped1(); mapped2(); })\n${emptySourceMap}`);
            const { threadId } = await p.dap.once('stopped');
            await p.logger.logStackTrace(threadId);
            await p.dap.stepOut({ threadId: threadId });
            p.logger.logAsConsole('\n# stepping out\n');
            await p.dap.once('stopped');
            await p.logger.logStackTrace(threadId);
            await p.dap.continue({ threadId: threadId });
            await result;
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('remembers step direction in', async ({ r }) => {
            const p = await r.launchUrlAndLoad('index.html');
            await p.addScriptTag('smartStep/directional.js');
            await p.waitForSource('directional.ts');
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/smartStep/directional.ts') },
                breakpoints: [{ line: 2, column: 0 }],
            });
            const result = p.evaluate(`doCall(() => { mapped1(); mapped2(); })\n${emptySourceMap}`);
            const { threadId } = await p.dap.once('stopped');
            await p.logger.logStackTrace(threadId);
            for (let i = 0; i < 2; i++) {
                await p.dap.stepIn({ threadId: threadId });
                await p.dap.once('stopped');
            }
            p.logger.logAsConsole('\n# stepping in\n');
            await p.logger.logStackTrace(threadId);
            await p.dap.continue({ threadId: threadId });
            await result;
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('does not smart step on exception breakpoints', async ({ r }) => {
            const p = await r.launchUrlAndLoad('index.html');
            await p.dap.setExceptionBreakpoints({ filters: ['uncaught', 'all'] });
            p.addScriptTag('smartStep/exceptionBp.js');
            await dumpStackAndContinue(p, false);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('does not smart step manual breakpoints', async ({ r }) => {
            const p = await r.launchUrlAndLoad('index.html');
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/smartStep/exceptionBp.js') },
                breakpoints: [{ line: 9, column: 0 }],
            });
            p.addScriptTag('smartStep/exceptionBp.js');
            await dumpStackAndContinue(p, false);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('does not step in sources missing maps', async ({ r }) => {
            const p = await r.launchUrlAndLoad('index.html');
            await p.addScriptTag('smartStep/missingMap.js');
            const evaluated = p.evaluate(`debugger; doCallback(() => {
        console.log("hi");
      });`);
            let threadId = (await p.dap.once('stopped')).threadId;
            await p.dap.stepIn({ threadId });
            threadId = (await p.dap.once('stopped')).threadId;
            await p.dap.stepIn({ threadId });
            await testIntegrationUtils_1.waitForPause(p);
            await evaluated;
            p.assertLog();
        });
    });
    testIntegrationUtils_1.itIntegrates('return value', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        p.cdp.Runtime.evaluate({
            expression: `
      function foo() {
        debugger;
        return 42;
      }
      foo();
    `,
        });
        const { threadId } = await p.dap.once('stopped'); // debugger
        p.dap.next({ threadId: threadId });
        await p.dap.once('stopped'); // return 42
        p.dap.next({ threadId: threadId });
        await dumpStackAndContinue(p, true); // exit point
        p.assertLog();
    });
    describe('skipFiles', () => {
        async function waitForPausedThenDelayStackTrace(p, scopes) {
            const event = await p.dap.once('stopped');
            await promiseUtil_1.delay(200); // need to pause test to let debouncer update scripts
            await p.logger.logStackTrace(event.threadId, scopes);
            return event;
        }
        testIntegrationUtils_1.itIntegrates('single authored js', async ({ r }) => {
            const p = await r.launchUrl('script.html', { skipFiles: ['**/script.js'] });
            const source = {
                path: p.workspacePath('web/script.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6, column: 0 }] });
            p.load();
            await waitForPausedThenDelayStackTrace(p, false);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('single compiled js', async ({ r }) => {
            const p = await r.launchUrlAndLoad('basic.html', { skipFiles: ['**/basic.js'] });
            const source = {
                path: p.workspacePath('web/basic.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3, column: 0 }] });
            p.load();
            await waitForPausedThenDelayStackTrace(p, false);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('multiple authored ts to js', async ({ r }) => {
            const p = await r.launchUrlAndLoad('browserify/browserify.html', {
                skipFiles: ['**/module*.ts'],
            });
            const evaluate = p.dap.evaluate({
                expression: 'window.callBack(() => { debugger });\nconsole.log("out");',
            });
            p.logger.logAsConsole('# at debugger:\n');
            const s1 = await waitForPausedThenDelayStackTrace(p, false);
            await p.dap.next({ threadId: s1.threadId });
            p.logger.logAsConsole('# after debugger:\n');
            const s2 = await waitForPausedThenDelayStackTrace(p, false);
            await p.dap.next({ threadId: s2.threadId });
            p.logger.logAsConsole('# should have stepped out:\n');
            await testIntegrationUtils_1.waitForPause(p);
            await evaluate;
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('works with absolute paths (#470)', async ({ r }) => {
            const p = await r.launchUrl('basic.html', {
                skipFiles: [`${test_1.testWorkspace}/web/basic.js`],
            });
            const source = {
                path: p.workspacePath('web/basic.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3, column: 0 }] });
            p.load();
            await waitForPausedThenDelayStackTrace(p, false);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('toggle authored ts', async ({ r }) => {
            const p = await r.launchUrlAndLoad('basic.html');
            const path = p.workspacePath('web/basic.ts');
            const source = {
                path: path,
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 21, column: 0 }] });
            p.load();
            const event = await p.dap.once('stopped');
            await promiseUtil_1.delay(500); // need to pause test to let debouncer update scripts
            await p.logger.logStackTrace(event.threadId, false);
            p.log('----send toggle skipfile status request----');
            await p.dap.toggleSkipFileStatus({ resource: path });
            await p.logger.logStackTrace(event.threadId, false);
            p.log('----send (un)toggle skipfile status request----');
            await p.dap.toggleSkipFileStatus({ resource: path });
            await p.logger.logStackTrace(event.threadId, false);
            p.assertLog();
        });
    });
});
//# sourceMappingURL=stacksTest.js.map
//# sourceMappingURL=stacksTest.js.map
