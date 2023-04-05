"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path_1 = require("path");
const fsUtils_1 = require("../../common/fsUtils");
const pathUtils_1 = require("../../common/pathUtils");
const createFileTree_1 = require("../createFileTree");
const goldenText_1 = require("../goldenText");
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
const del = require("del");
describe('breakpoints', () => {
    describe('configure', () => {
        testIntegrationUtils_1.itIntegrates('inline', async ({ r }) => {
            // Breakpoint in inline script set before launch.
            const p = await r.launchUrl('inlinescript.html');
            const source = {
                path: p.workspacePath('web/inlinescript.html'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3, column: 2 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('script', async ({ r }) => {
            // Breakpoint in separate script set before launch.
            const p = await r.launchUrl('script.html');
            const source = {
                path: p.workspacePath('web/script.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 9, column: 0 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('query params', async ({ r }) => {
            // Breakpoint in separate script set before launch.
            const p = await r.launchUrl('script-with-query-param.html');
            const source = {
                path: p.workspacePath('web/script.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 9, column: 0 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('remove', async ({ r }) => {
            // Breakpoint in separate script set before launch, but then removed.
            const p = await r.launchUrl('script.html');
            const source = {
                path: p.workspacePath('web/script.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 2, column: 0 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p, async () => {
                await p.dap.setBreakpoints({ source });
            });
            await testIntegrationUtils_1.waitForPause(p);
            p.cdp.Runtime.evaluate({ expression: 'foo();\ndebugger;\n//# sourceURL=test.js' });
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('source map', async ({ r }) => {
            // Breakpoint in source mapped script set before launch.
            // Note: this only works in Chrome 76 or later and Node 12 or later, since it relies
            // on 'pause before executing script with source map' functionality in CDP.
            const p = await r.launchUrl('browserify/pause.html');
            const source = {
                path: p.workspacePath('web/browserify/module2.ts'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('absolute paths in source maps', async ({ r }) => {
            // Some builds create absolute disk paths in sourcemaps. This test
            // swaps relative paths with absolute paths in the browserify test
            // and makes sure it works identically.
            const cwd = r.workspacePath('web/tmp');
            after(() => del([`${pathUtils_1.forceForwardSlashes(cwd)}/**`], {
                force: true /* delete outside cwd */,
            }));
            createFileTree_1.createFileTree(cwd, {
                'pause.js': await fsUtils_1.readfile(r.workspacePath('web/browserify/pause.js')),
                'pause.html': await fsUtils_1.readfile(r.workspacePath('web/browserify/pause.html')),
                'pause.js.map': (await fsUtils_1.readfile(r.workspacePath('web/browserify/pause.js.map'))).replace(/"([a-z0-9]+.ts)"/g, `"${pathUtils_1.forceForwardSlashes(r.workspacePath('web/browserify'))}/$1"`),
            });
            const p = await r.launchUrl('tmp/pause.html');
            const source = {
                path: p.workspacePath('web/browserify/module2.ts'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('source map predicted', async ({ r }) => {
            // Breakpoint in source mapped script set before launch use breakpoints predictor.
            const p = await r.launchUrl('browserify/pause.html');
            p.adapter.breakpointManager.setSourceMapPauseDisabledForTest();
            p.adapter.breakpointManager.setPredictorDisabledForTest(false);
            const source = {
                path: p.workspacePath('web/browserify/module2.ts'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
    });
    describe('launched', () => {
        testIntegrationUtils_1.itIntegrates('inline', async ({ r }) => {
            // Breakpoint in inline script set after launch.
            const p = await r.launchUrl('inlinescriptpause.html');
            p.load();
            await testIntegrationUtils_1.waitForPause(p, async () => {
                const source = {
                    path: p.workspacePath('web/inlinescriptpause.html'),
                };
                await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6 }] });
            });
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('script', async ({ r }) => {
            // Breakpoint in separate script set after launch.
            const p = await r.launchUrl('script.html');
            p.load();
            await testIntegrationUtils_1.waitForPause(p, async () => {
                const source = {
                    path: p.workspacePath('web/script.js'),
                };
                await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6 }] });
            });
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('ref', async ({ r }) => {
            // Breakpoint in eval script set after launch using source reference.
            const p = await r.launchUrlAndLoad('index.html');
            p.cdp.Runtime.evaluate({
                expression: `
        function foo() {
          return 2;
        }
      `,
            });
            const { source } = await p.waitForSource('eval');
            source.path = undefined;
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            const evaluation = p.evaluate('foo();');
            await testIntegrationUtils_1.waitForPause(p);
            await evaluation;
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('remove', async ({ r }) => {
            // Breakpoint in eval script set after launch and immediately removed.
            const p = await r.launchUrlAndLoad('index.html');
            p.cdp.Runtime.evaluate({
                expression: `
        function foo() {
          return 2;
        }
      `,
            });
            const { source } = await p.waitForSource('eval');
            source.path = undefined;
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            await p.dap.setBreakpoints({ source });
            p.cdp.Runtime.evaluate({ expression: 'foo();\ndebugger;\n//# sourceURL=test.js' });
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('overwrite', async ({ r }) => {
            // Breakpoint in eval script set after launch and immediately overwritten.
            const p = await r.launchUrlAndLoad('index.html');
            p.cdp.Runtime.evaluate({
                expression: `
        function foo() {
          var x = 3;
          return 2;
        }
      `,
            });
            const { source } = await p.waitForSource('eval');
            source.path = undefined;
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 4 }] });
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            p.cdp.Runtime.evaluate({ expression: 'foo();\ndebugger;\n//# sourceURL=test.js' });
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('source map', async ({ r }) => {
            // Breakpoint in source mapped script set after launch.
            const p = await r.launchUrlAndLoad('browserify/browserify.html');
            await p.waitForSource('module2.ts');
            const source = {
                path: p.workspacePath('web/browserify/module2.ts'),
            };
            const resolved = await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            chai_1.expect(resolved.breakpoints[0].verified).to.be.true;
            p.cdp.Runtime.evaluate({
                expression: 'window.callBack(window.pause);\n//# sourceURL=test.js',
            });
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('source map remove', async ({ r }) => {
            // Breakpoint in source mapped script set after launch and immediately removed.
            const p = await r.launchUrlAndLoad('browserify/browserify.html');
            const source = {
                path: p.workspacePath('web/browserify/module2.ts'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 3 }] });
            await p.dap.setBreakpoints({ source, breakpoints: [] });
            p.cdp.Runtime.evaluate({
                expression: 'window.callBack(window.pause);\n//# sourceURL=test.js',
            });
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        // See #109
        testIntegrationUtils_1.itIntegrates('source map set compiled', async ({ r }) => {
            // Breakpoint in compiled script which has a source map should resolve
            // to the compiled script.
            const p = await r.launchUrl('browserify/browserify.html');
            p.load();
            await p.waitForSource('bundle.js');
            const resolved = await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/browserify/bundle.js') },
                breakpoints: [{ line: 36 }],
            });
            delete resolved.breakpoints[0].source.sources;
            p.log(resolved.breakpoints[0], 'Breakpoint resolved: ');
            p.cdp.Runtime.evaluate({
                expression: 'window.callBack(window.pause);\n//# sourceURL=test.js',
            });
            // Should pause in 'bundle.js'.
            const { threadId } = p.log(await p.dap.once('stopped'));
            await p.logger.logStackTrace(threadId);
            p.dap.stepIn({ threadId });
            // Should step into in 'bundle.js'.
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        // See #109
        testIntegrationUtils_1.itIntegrates('source map set compiled 2', async ({ r }) => {
            // Breakpoint in compiled script which has a source map should resolve
            // to the compiled script.
            const p = await r.launchUrl('browserify/browserify.html');
            p.load();
            await p.waitForSource('bundle.js');
            const resolved = await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/browserify/bundle.js') },
                breakpoints: [{ line: 36 }],
            });
            delete resolved.breakpoints[0].source.sources;
            p.log(resolved.breakpoints[0], 'Breakpoint resolved: ');
            p.cdp.Runtime.evaluate({
                expression: 'window.callBack(window.pause);\n//# sourceURL=test.js',
            });
            // Should pause in 'bundle.js'.
            await testIntegrationUtils_1.waitForPause(p);
            // Should resume and pause on 'debugger' in module1.ts.
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('sets breakpoints in sourcemapped node_modules', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'nodeModuleBreakpoint');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'), {
                outFiles: [`${cwd}/**/*.js`],
                env: { MODULE: '@c4312/foo' },
                resolveSourceMapLocations: null,
            });
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'node_modules', '@c4312', 'foo', 'src', 'index.ts') },
                breakpoints: [{ line: 2, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('sets breakpoints in sourcemapped node_modules with absolute root', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'nodeModuleBreakpoint');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'), {
                outFiles: [`${cwd}/**/*.js`],
                env: { MODULE: '@c4312/absolute-sourceroot' },
                resolveSourceMapLocations: null,
            });
            await handle.dap.setBreakpoints({
                source: {
                    path: path_1.join(cwd, 'node_modules', '@c4312', 'absolute-sourceroot', 'src', 'index.ts'),
                },
                breakpoints: [{ line: 2, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('absolute path in nested module', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'nestedAbsRoot');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'test.js') },
                breakpoints: [{ line: 1, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
    });
    describe('logpoints', () => {
        testIntegrationUtils_1.itIntegrates('basic', async ({ r }) => {
            const p = await r.launchUrl('logging.html');
            const source = {
                path: p.workspacePath('web/logging.js'),
            };
            const breakpoints = [
                { line: 6, column: 0, logMessage: '123' },
                { line: 7, column: 0, logMessage: "{({foo: 'bar'})}" },
                { line: 8, column: 0, logMessage: '{foo}' },
                { line: 9, column: 0, logMessage: 'foo {foo} bar' },
                { line: 10, column: 0, logMessage: 'foo {bar + baz}' },
                { line: 11, column: 0, logMessage: '{const a = bar + baz; a}' },
                { line: 12, column: 0, logMessage: '{(x=>x+baz)(bar)}' },
                { line: 13, column: 0, logMessage: '{throw new Error("oof")}' },
                { line: 14, column: 0, logMessage: "{'hi'}" },
            ];
            await p.dap.setBreakpoints({
                source,
                breakpoints,
            });
            p.load();
            const outputs = [];
            for (let i = 0; i < breakpoints.length; i++) {
                outputs.push(await p.dap.once('output'));
            }
            for (const o of outputs) {
                await p.logger.logOutput(o);
            }
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('callstack', async ({ r }) => {
            const p = await r.launchUrl('logging.html');
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/logging.js') },
                breakpoints: [{ line: 6, column: 0, logMessage: '123' }],
            });
            p.load();
            p.log(await p.dap.once('output'));
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('returnValue', async ({ r }) => {
            const p = await r.launchUrl('logging.html');
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/logging.js') },
                breakpoints: [{ line: 32, column: 100, logMessage: 'doubled: {$returnValue * 2}' }],
            });
            p.load();
            await p.logger.logOutput(await p.dap.once('output'));
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('no double log', async ({ r }) => {
            const p = await r.launchUrlAndLoad('logging.html');
            const source = {
                path: p.workspacePath('web/logging.js'),
            };
            await p.dap.setBreakpoints({
                source,
                breakpoints: [
                    {
                        line: 28,
                        column: 0,
                        logMessage: "{'LOG' + (window.logValue = (window.logValue || 0) + 1)}",
                    },
                ],
            });
            p.cdp.Runtime.evaluate({ expression: "g(); console.log('DONE' + window.logValue)" });
            const outputs = [];
            for (let i = 0; i < 2; i++) {
                outputs.push(await p.dap.once('output'));
            }
            for (const o of outputs) {
                await p.logger.logOutput(o);
            }
            p.assertLog();
        });
    });
    describe('hit condition', () => {
        async function waitForPauseAndLogI(p) {
            await testIntegrationUtils_1.waitForPause(p, async () => {
                await p.logger.evaluateAndLog('i');
            });
        }
        testIntegrationUtils_1.itIntegrates('exact', async ({ r }) => {
            const p = await r.launchUrl('condition.html');
            const source = {
                path: p.workspacePath('web/condition.js'),
            };
            await p.dap.setBreakpoints({
                source,
                breakpoints: [{ line: 2, column: 0, hitCondition: '==2' }],
            });
            p.load();
            await waitForPauseAndLogI(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('less than', async ({ r }) => {
            // Breakpoint in separate script set before launch.
            const p = await r.launchUrl('condition.html');
            const source = {
                path: p.workspacePath('web/condition.js'),
            };
            await p.dap.setBreakpoints({
                source,
                breakpoints: [{ line: 2, column: 0, hitCondition: '<3' }],
            });
            p.load();
            await waitForPauseAndLogI(p);
            await waitForPauseAndLogI(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('greater than', async ({ r }) => {
            // Breakpoint in separate script set before launch.
            const p = await r.launchUrl('condition.html');
            const source = {
                path: p.workspacePath('web/condition.js'),
            };
            await p.dap.setBreakpoints({
                source,
                breakpoints: [{ line: 2, column: 0, hitCondition: '>3' }],
            });
            p.load();
            await waitForPauseAndLogI(p);
            await waitForPauseAndLogI(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('invalid', async ({ r }) => {
            // Breakpoint in separate script set before launch.
            const p = await r.launchUrl('condition.html');
            const source = {
                path: p.workspacePath('web/condition.js'),
            };
            p.dap.on('output', output => {
                if (output.category === 'stderr') {
                    p.logger.logOutput(output);
                }
            });
            await p.dap.setBreakpoints({
                source,
                breakpoints: [{ line: 2, column: 0, hitCondition: 'abc' }],
            });
            p.load();
            await testIntegrationUtils_1.waitForPause(p); // falls through to debugger statement
            p.assertLog();
        });
    });
    describe('condition', () => {
        async function waitForPauseAndLogI(p) {
            await testIntegrationUtils_1.waitForPause(p, async () => {
                await p.logger.evaluateAndLog('i');
            });
        }
        testIntegrationUtils_1.itIntegrates('basic', async ({ r }) => {
            const p = await r.launchUrl('condition.html');
            const source = {
                path: p.workspacePath('web/condition.js'),
            };
            await p.dap.setBreakpoints({
                source,
                breakpoints: [{ line: 2, column: 0, condition: 'i==2' }],
            });
            p.load();
            await waitForPauseAndLogI(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('ignores error by default', async ({ r }) => {
            const p = await r.launchUrl('condition.html');
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/condition.js') },
                breakpoints: [{ line: 2, column: 0, condition: '(() => { throw "oh no" })()' }],
            });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('pauses on error', async ({ r }) => {
            const p = await r.launchUrl('condition.html', { __breakOnConditionalError: true });
            await p.dap.setBreakpoints({
                source: { path: p.workspacePath('web/condition.js') },
                breakpoints: [{ line: 2, column: 0, condition: '(() => { throw "oh no" })()' }],
            });
            p.load();
            const output = p.dap.once('output');
            await testIntegrationUtils_1.waitForPause(p);
            p.logger.logOutput(await output);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('ignores bp with invalid condition', async ({ r }) => {
            // Breakpoint in separate script set before launch.
            const p = await r.launchUrl('condition.html');
            const output = p.dap.once('output');
            const source = {
                path: p.workspacePath('web/condition.js'),
            };
            await p.dap.setBreakpoints({
                source,
                breakpoints: [{ line: 2, column: 0, condition: ')(}{][.&' }],
            });
            p.load();
            await r.log(await output); // an error message
            await testIntegrationUtils_1.waitForPause(p); // falls through to debugger statement
            p.assertLog();
        });
    });
    describe('custom', () => {
        testIntegrationUtils_1.itIntegrates('inner html', async ({ r }) => {
            // Custom breakpoint for innerHtml.
            const p = await r.launchAndLoad('<div>text</div>');
            p.log('Not pausing on innerHTML');
            await p.evaluate(`document.querySelector('div').innerHTML = 'foo';`);
            p.log('Pausing on innerHTML');
            await p.dap.enableCustomBreakpoints({ ids: ['instrumentation:Element.setInnerHTML'] });
            p.evaluate(`document.querySelector('div').innerHTML = 'bar';`);
            const event = p.log(await p.dap.once('stopped'));
            p.log(await p.dap.continue({ threadId: event.threadId }));
            p.assertLog();
        });
    });
    describe('first line', () => {
        testIntegrationUtils_1.itIntegrates('breaks if requested', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'index.js') },
                breakpoints: [{ line: 1, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('does not break if not requested', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'simpleNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'index.js') },
                breakpoints: [{ line: 2, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
    });
    describe('hot-transpiled', () => {
        testIntegrationUtils_1.itIntegrates('breaks on first line', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'tsNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'double.ts') },
                breakpoints: [{ line: 1, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('user defined bp on first line', async ({ r }) => {
            // The scenario is if a user-defined breakpoint is hit on the first line
            // of the script, even if in the transpiled code it should have been
            // on a different line. This tests that we run a hit-check after source maps.
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'tsNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'log.ts') },
                breakpoints: [{ line: 2, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('adjusts breakpoints', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'tsNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'double.ts') },
                breakpoints: [{ line: 5, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('adjusts breakpoints after already running (#524)', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'tsNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'double.ts') },
                breakpoints: [{ line: 5, column: 1 }],
            });
            handle.load();
            const { threadId } = await handle.dap.once('stopped');
            handle.log(await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'double.ts') },
                breakpoints: [{ line: 15, column: 1 }],
            }));
            handle.dap.continue({ threadId: threadId });
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('works in remote workspaces', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'tsNode');
            const handle = await r.runScriptAsRemote(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'double.ts') },
                breakpoints: [{ line: 5, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
        testIntegrationUtils_1.itIntegrates('does not adjust already correct', async ({ r }) => {
            await r.initialize;
            const cwd = path_1.join(test_1.testWorkspace, 'tsNode');
            const handle = await r.runScript(path_1.join(cwd, 'index.js'));
            await handle.dap.setBreakpoints({
                source: { path: path_1.join(cwd, 'matching-line.ts') },
                breakpoints: [{ line: 3, column: 1 }],
            });
            handle.load();
            await testIntegrationUtils_1.waitForPause(handle);
            handle.assertLog({ substring: true });
        });
    });
    testIntegrationUtils_1.itIntegrates('restart frame', async ({ r }) => {
        const p = await r.launchUrl('restart.html');
        const source = {
            path: p.workspacePath('web/restart.js'),
        };
        await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6, column: 0 }] });
        p.load();
        const { threadId } = p.log(await p.dap.once('stopped'));
        const stack = await p.logger.logStackTrace(threadId);
        p.dap.restartFrame({ frameId: stack[0].id });
        await testIntegrationUtils_1.waitForPause(p);
        p.assertLog();
    });
    describe('lazy async stack', () => {
        testIntegrationUtils_1.itIntegrates('sets stack on pause', async ({ r }) => {
            // First debugger; hit will have no async stack, the second (after turning on) will
            const p = await r.launchUrl('asyncStack.html', {
                showAsyncStacks: { onceBreakpointResolved: 32 },
            });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('sets eagerly on bp', async ({ r }) => {
            // Both debugger; hits will have async stacks since we had a resolved BP
            const p = await r.launchUrl('asyncStack.html', {
                showAsyncStacks: { onceBreakpointResolved: 32 },
            });
            const source = {
                path: p.workspacePath('web/asyncStack.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 5, column: 1 }] });
            p.load();
            await testIntegrationUtils_1.waitForPause(p);
            await testIntegrationUtils_1.waitForPause(p);
            p.assertLog();
        });
    });
    testIntegrationUtils_1.itIntegrates('gets correct line number with babel code (#407)', async ({ r }) => {
        await r.initialize;
        const cwd = path_1.join(test_1.testWorkspace, 'babelLineNumbers');
        const handle = await r.runScript(path_1.join(cwd, `compiled.js`));
        await handle.dap.setBreakpoints({
            source: { path: path_1.join(cwd, 'compiled.js') },
            breakpoints: [{ line: 1 }],
        });
        await handle.dap.setBreakpoints({
            source: { path: path_1.join(cwd, 'app.tsx') },
            breakpoints: [{ line: 2 }],
        });
        handle.load();
        const { threadId } = handle.log(await handle.dap.once('stopped'));
        await handle.dap.continue({ threadId });
        await testIntegrationUtils_1.waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('vue projects', async ({ r }) => {
        const p = await r.launchUrl('vue/index.html');
        await p.dap.setBreakpoints({
            source: { path: p.workspacePath('web/src/App.vue') },
            breakpoints: [{ line: 9, column: 1 }],
        });
        p.load();
        const { threadId } = p.log(await p.dap.once('stopped'));
        await p.logger.logStackTrace(threadId);
        p.dap.stepIn({ threadId });
        await testIntegrationUtils_1.waitForPause(p);
        p.assertLog();
    });
    describe('breakpoint placement', () => {
        const cwd = path_1.join(test_1.testWorkspace, 'sourceMapLocations');
        describe('first function stmt', () => {
            ['tsc', 'babel'].forEach(tcase => testIntegrationUtils_1.itIntegrates(tcase, async ({ r }) => {
                await r.initialize;
                const handle = await r.runScript(path_1.join(cwd, `${tcase}.js`));
                await handle.dap.setBreakpoints({
                    source: { path: path_1.join(cwd, 'test.ts') },
                    breakpoints: [{ line: 4, column: 1 }],
                });
                handle.load();
                await testIntegrationUtils_1.waitForPause(handle);
                handle.assertLog({ substring: true });
            }));
        });
        describe('end function stmt', () => {
            ['tsc', 'babel'].forEach(tcase => testIntegrationUtils_1.itIntegrates(tcase, async ({ r }) => {
                await r.initialize;
                const handle = await r.runScript(path_1.join(cwd, `${tcase}.js`));
                await handle.dap.setBreakpoints({
                    source: { path: path_1.join(cwd, 'test.ts') },
                    breakpoints: [{ line: 6, column: 1 }],
                });
                handle.load();
                await testIntegrationUtils_1.waitForPause(handle);
                handle.assertLog({ substring: true });
            }));
        });
    });
    describe('hit count', () => {
        const doTest = async (r, run) => {
            const p = await r.launchUrlAndLoad('index.html');
            p.cdp.Runtime.evaluate({
                expression: `
        function foo() {
          for (let i = 0; i < 10; i++) {
            console.log(i);
            console.log(i);
            console.log(i);
          }
        }
      `,
            });
            const { source } = await p.waitForSource('eval');
            source.path = undefined;
            await run(p, source);
            p.assertLog();
        };
        const waitForHit = async (p) => {
            const { threadId: pageThreadId } = await p.dap.once('stopped');
            const { id: pageFrameId } = (await p.dap.stackTrace({
                threadId: pageThreadId,
            })).stackFrames[0];
            await p.logger.logEvaluateResult(await p.dap.evaluate({ expression: 'i', frameId: pageFrameId }));
            return p.dap.continue({ threadId: pageThreadId });
        };
        testIntegrationUtils_1.itIntegrates('works for valid', async ({ r }) => {
            await doTest(r, async (p, source) => {
                r.log(await p.dap.setBreakpoints({ source, breakpoints: [{ line: 4, hitCondition: '=5' }] }));
                const evaluate = p.evaluate('foo();');
                await waitForHit(p);
                await evaluate;
            });
        });
        testIntegrationUtils_1.itIntegrates('can change after set', async ({ r }) => {
            await doTest(r, async (p, source) => {
                r.log(await p.dap.setBreakpoints({ source, breakpoints: [{ line: 4, hitCondition: '=5' }] }));
                r.log(await p.dap.setBreakpoints({ source, breakpoints: [{ line: 4, hitCondition: '=8' }] }));
                const evaluate = p.evaluate('foo();');
                await waitForHit(p);
                await evaluate;
            });
        });
        testIntegrationUtils_1.itIntegrates('does not validate or hit invalid breakpoint', async ({ r }) => {
            await doTest(r, async (p, source) => {
                const output = p.dap.once('output');
                r.log(await p.dap.setBreakpoints({
                    source,
                    breakpoints: [{ line: 4, hitCondition: 'potato' }],
                }));
                await r.log(await output); // an error message
                await p.evaluate('foo();'); // should complete without getting paused
            });
        });
    });
    testIntegrationUtils_1.itIntegrates('user defined bp on first line with stop on entry on .ts file reports as breakpoint', async ({ r }) => {
        await r.initialize;
        const cwd = path_1.join(test_1.testWorkspace, 'tsNodeApp');
        const handle = await r.runScript(path_1.join(cwd, 'app.ts'), {
            stopOnEntry: true,
            smartStep: false,
        });
        await handle.dap.setBreakpoints({
            source: { path: path_1.join(cwd, 'app.ts') },
            breakpoints: [{ line: 1, column: 1 }],
        });
        handle.load();
        await testIntegrationUtils_1.waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('stop on entry on .ts file reports as entry', async ({ r }) => {
        await r.initialize;
        const cwd = path_1.join(test_1.testWorkspace, 'tsNodeApp');
        const handle = await r.runScript(path_1.join(cwd, 'app.ts'), {
            stopOnEntry: true,
            smartStep: false,
        });
        await handle.dap.setBreakpoints({
            source: { path: path_1.join(cwd, 'app.tsx') },
            breakpoints: [{ line: 2, column: 1 }],
        });
        handle.load();
        await testIntegrationUtils_1.waitForPause(handle);
        handle.assertLog({ substring: true });
    });
    testIntegrationUtils_1.itIntegrates('reevaluates breakpoints when new sources come in (#600)', async ({ r }) => {
        const p = await r.launchUrl('unique-refresh?v=1');
        p.load();
        // to trigger the bug, must wait for the source otherwise it will set by path and not url:
        const { source } = await p.waitForSource('hello.js');
        p.dap.setBreakpoints({
            source,
            breakpoints: [{ line: 2, column: 1 }],
        });
        await testIntegrationUtils_1.waitForPause(p);
        p.cdp.Page.navigate({ url: r.buildUrl('unique-refresh?v=2') });
        await testIntegrationUtils_1.waitForPause(p);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('can step in when first line of code is function', async ({ r }) => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'test.js': ['function double(x) {', '  x *= 2;', '  return x;', '}', 'double(2)'],
        });
        const handle = await r.runScript('test.js');
        await handle.dap.setBreakpoints({
            source: { path: path_1.join(test_1.testFixturesDir, 'test.js') },
            breakpoints: [{ line: 5, column: 0 }],
        });
        handle.load();
        const { threadId } = handle.log(await handle.dap.once('stopped'));
        await handle.logger.logStackTrace(threadId);
        handle.dap.stepIn({ threadId });
        await testIntegrationUtils_1.waitForPause(handle);
        handle.assertLog({ process: goldenText_1.removeNodeInternalsStackLines });
    });
});
//# sourceMappingURL=breakpointsTest.js.map
//# sourceMappingURL=breakpointsTest.js.map
