"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const promiseUtil_1 = require("../../common/promiseUtil");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('evaluate', () => {
    testIntegrationUtils_1.itIntegrates('default', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html');
        await p.logger.evaluateAndLog(`42`);
        p.log('');
        await p.logger.evaluateAndLog(`'foo'`);
        p.log('');
        await p.logger.evaluateAndLog(`1234567890n`);
        p.log('');
        await p.logger.evaluateAndLog(`throw new Error('foo')`);
        p.log('');
        await p.logger.evaluateAndLog(`throw {foo: 3, bar: 'baz'};`);
        p.log('');
        await p.logger.evaluateAndLog(`throw 42;`);
        p.log('');
        await p.logger.evaluateAndLog(`{foo: 3}`);
        p.log('');
        await p.logger.evaluateAndLog(`baz();`);
        p.log('');
        await p.logger.evaluateAndLog(`new Uint8Array([1, 2, 3]);`);
        p.log('');
        await p.logger.evaluateAndLog(`new Uint8Array([1, 2, 3]).buffer;`);
        p.log('');
        await p.logger.evaluateAndLog(`new Proxy({ a: 1 }, { get: () => 2 });`);
        p.log('');
        // prototype-free objs just to avoid adding prototype noise to tests:
        await p.logger.evaluateAndLog(`Object.create({ set foo(x) {} })`, { depth: 2 });
        p.log('');
        await p.logger.evaluateAndLog(`Object.create({ get foo() { return 42 } })`, { depth: 2 });
        p.log('');
        await p.logger.evaluateAndLog(`Object.create({ get foo() { throw 'wat'; } })`, { depth: 2 });
        p.log('');
        p.evaluate(`setTimeout(() => { throw new Error('bar')}, 0)`);
        await p.logger.logOutput(await p.dap.once('output'));
        p.log('');
        p.dap.evaluate({ expression: `setTimeout(() => { throw new Error('baz')}, 0)` });
        await p.logger.logOutput(await p.dap.once('output'));
        p.log('');
        await p.addScriptTag('browserify/bundle.js');
        await p.logger.evaluateAndLog(`window.throwError('error1')`);
        p.log('');
        await p.logger.evaluateAndLog(`window.throwValue({foo: 3, bar: 'baz'})`);
        p.log('');
        p.dap.evaluate({ expression: `setTimeout(() => { window.throwError('error2')}, 0)` });
        await p.logger.logOutput(await p.dap.once('output'));
        p.log('');
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('repl', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html');
        await p.logger.evaluateAndLog('42', undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`'foo'`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`1234567890n`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`throw new Error('foo')`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`throw {foo: 3, bar: 'baz'};`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`throw 42;`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`{foo: 3}`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`baz();`, undefined, 'repl');
        p.log('');
        // #490
        await p.logger.evaluateAndLog(`new Map([['hello', function() { return 'world' }]])`, undefined, 'repl');
        p.log('');
        const [, e1] = await Promise.all([
            p.logger.evaluateAndLog(`setTimeout(() => { throw new Error('bar')}, 0); 42`, undefined, 'repl'),
            p.dap.once('output'),
        ]);
        await p.logger.logOutput(e1);
        p.log('');
        const [, e2] = await Promise.all([
            p.logger.evaluateAndLog(`setTimeout(() => { throw new Error('baz')}, 0); 42`, undefined, 'repl'),
            p.dap.once('output'),
        ]);
        await p.logger.logOutput(e2);
        p.log('');
        await p.addScriptTag('browserify/bundle.js');
        await p.logger.evaluateAndLog(`window.throwError('error1')`, undefined, 'repl');
        p.log('');
        await p.logger.evaluateAndLog(`window.throwValue({foo: 3, bar: 'baz'})`, undefined, 'repl');
        p.log('');
        const [, e3] = await Promise.all([
            p.logger.evaluateAndLog(`setTimeout(() => { window.throwError('error2')}, 0); 42`, undefined, 'repl'),
            p.dap.once('output'),
        ]);
        await p.logger.logOutput(e3);
        p.log('');
        p.assertLog();
    });
    const copyExpressions = {
        '123n': '123n',
        NaN: 'NaN',
        '{foo: "bar", baz: { a: [1, 2, 3, 4, 5, 6, 7, 8, 9], b: 123n, "complex key": true }}': `{
  foo: "bar",
  baz: {
    a: [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
    ],
    b: 123n,
    "complex key": true,
  },
}`,
        [`{
  double(x) {
    return x * 2;
  },
  triple: x => {
    return x * 3
  }
}`]: `{
  double: function(x) {
    return x * 2;
  },
  triple: x => {
    return x * 3
  },
}`,
        'function hello() { return "world" }': 'function hello() { return "world" }',
        '(() => { const n = { foo: true }; n.recurse = n; return n })()': `{
  foo: true,
  recurse: [Circular],
}`,
        '1n << 100n': '1267650600228229401496703205376n',
        '(() => { const node = document.createElement("div"); node.innerText = "hi"; return node })()': `<div>hi</div>`,
    };
    testIntegrationUtils_1.itIntegrates('copy via function', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        p.dap.evaluate({ expression: 'var x = "hello"; copy(x)' });
        chai_1.expect((await p.dap.once('copyRequested')).text).to.equal('hello');
        for (const [expression, expected] of Object.entries(copyExpressions)) {
            p.dap.evaluate({ expression: `copy(${expression})` });
            const actual = await p.dap.once('copyRequested');
            chai_1.expect(actual.text).to.equal(expected, expression);
        }
    });
    testIntegrationUtils_1.itIntegrates('copy via evaluate context', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        for (const [expression, expected] of Object.entries(copyExpressions)) {
            const actual = await p.dap.evaluate({ expression, context: 'clipboard' });
            chai_1.expect(actual.result).to.equal(expected, expression);
        }
    });
    testIntegrationUtils_1.itIntegrates('inspect', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        p.dap.evaluate({ expression: 'function foo() {}; inspect(foo)\n//# sourceURL=test.js' });
        p.log(await p.dap.once('revealLocationRequested'));
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('queryObjects', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        await p.dap.evaluate({
            expression: `
      class Foo {
        constructor(value) {
          this.value = value;
        }
      }
      var foo1 = new Foo(1);
      var foo2 = new Foo(2);
    `,
        });
        p.dap.evaluate({ expression: 'queryObjects(Foo)' });
        await p.logger.logOutput(await p.dap.once('output'));
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('topLevelAwait', async ({ r }) => {
        const p = await r.launchAndLoad(`
      <script>
        function foo(x) {
          return x;
        }

        function koo() {
          return Promise.resolve(4);
        }
      </script>
    `);
        const exprs = [
            'await Promise.resolve(1)',
            '{a:await Promise.resolve(1)}',
            '$_',
            'let {a,b} = await Promise.resolve({a: 1, b:2}), f = 5;',
            'a',
            'b',
            'let c = await Promise.resolve(2)',
            'c',
            'let d;',
            'd',
            'let [i,{abc:{k}}] = [0,{abc:{k:1}}];',
            'i',
            'k',
            'var l = await Promise.resolve(2);',
            'l',
            'foo(await koo());',
            '$_',
            'const m = foo(await koo());',
            'm',
            'const n = foo(await\nkoo());',
            'n',
            '`status: ${(await Promise.resolve({status:200})).status}`',
            'for (let i = 0; i < 2; ++i) await i',
            'for (let i = 0; i < 2; ++i) { await i }',
            'await 0',
            'await 0;function foo(){}',
            'foo',
            'class Foo{}; await 1;',
            'Foo',
            'await 0;function* gen(){}',
            'for (var i = 0; i < 10; ++i) { await i; }',
            'i',
            'for (let j = 0; j < 5; ++j) { await j; }',
            'j',
            'gen',
            'await 5; return 42;',
            'let o = await 1, p',
            'p',
            'let q = 1, s = await 2',
            's',
            'await {...{foo: 42}}',
        ];
        for (const expression of exprs) {
            p.log(`Evaluating: '${expression}'`);
            p.logger.logEvaluateResult(await p.dap.evaluate({ expression, context: 'repl' }), {
                depth: 0,
            });
        }
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('escapes strings', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        for (const context of ['watch', 'hover', 'repl']) {
            p.log(`context=${context}`);
            await p.logger.evaluateAndLog(JSON.stringify('1\n2\r3\t\\4'), { depth: 0 }, context);
        }
        p.assertLog({
            customAssert: str => chai_1.expect(str).to.equal([
                'context=watch',
                "result: '1\\n2\\r3\\t\\\\4'",
                'context=hover',
                "result: '1\\n2\\r3\\t\\\\4'",
                'context=repl',
                "\nresult: '1\n2\r3\t\\4'",
                '',
            ].join('\n')),
        });
    });
    testIntegrationUtils_1.itIntegrates.skip('output slots', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        const empty = await p.dap.evaluate({
            expression: 'let i = 0; console.log(++i); ++i',
            context: 'repl',
        });
        const console = await p.dap.once('output');
        const result = await p.dap.once('output');
        await p.logger.logEvaluateResult(empty);
        await p.logger.logOutput(console);
        await p.logger.logOutput(result);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates.skip('output slots 2', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        const empty = await p.dap.evaluate({
            expression: `
      let i = 0;
      setTimeout(() => {
        console.log(++i);
        throw {foo: ++i};
      }, 0);
      ++i
    `,
            context: 'repl',
        });
        const result = await p.dap.once('output');
        const console = await p.dap.once('output');
        const exception = await p.dap.once('output');
        await p.logger.logEvaluateResult(empty);
        await p.logger.logOutput(result);
        await p.logger.logOutput(console);
        await p.logger.logOutput(exception);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('selected context', async ({ r }) => {
        const p = await r.launchUrlAndLoad('worker.html');
        p.log('--- Evaluating in page');
        p.log('Pausing...');
        p.dap.evaluate({ expression: `window.w.postMessage('pause');`, context: 'repl' });
        const { threadId: pageThreadId } = await p.dap.once('stopped');
        p.log('Paused');
        const { id: pageFrameId } = (await p.dap.stackTrace({
            threadId: pageThreadId,
        })).stackFrames[0];
        await p.logger.logEvaluateResult(await p.dap.evaluate({ expression: 'isWorker', frameId: pageFrameId }), { depth: 0 });
        p.dap.continue({ threadId: pageThreadId });
        await p.dap.once('continued');
        p.log('Resumed');
        p.log('--- Evaluating in worker');
        p.dap.evaluate({ expression: `window.w.postMessage('pauseWorker');`, context: 'repl' });
        const worker = await r.worker();
        const { threadId: workerThreadId } = await worker.dap.once('stopped');
        p.log('Paused');
        const { id: workerFrameId } = (await worker.dap.stackTrace({
            threadId: workerThreadId,
        })).stackFrames[0];
        await worker.logger.logEvaluateResult(await worker.dap.evaluate({ expression: 'isWorker', frameId: workerFrameId }), { depth: 0 });
        worker.dap.continue({ threadId: workerThreadId });
        await worker.dap.once('continued');
        p.log('Resumed');
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('cd', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html');
        async function logCompletions(params) {
            const completions = await p.dap.completions(params);
            const text = params.text.substring(0, params.column - 1) +
                '|' +
                params.text.substring(params.column - 1);
            p.log(completions.targets.filter(c => c.label.startsWith('cd')), `"${text}": `);
        }
        await promiseUtil_1.delay(50); // todo(connor4312): there's some race here on the first resolution
        await logCompletions({ line: 1, column: 1, text: '' });
        await logCompletions({ line: 1, column: 3, text: 'cd' });
        await logCompletions({ line: 1, column: 4, text: 'cd ' });
        await logCompletions({ line: 1, column: 5, text: 'cd t' });
        await logCompletions({ line: 1, column: 5, text: 'cd h' });
        await logCompletions({ line: 1, column: 2, text: 'cd' });
        await logCompletions({ line: 1, column: 3, text: 'co' });
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('returnValue', async ({ r }) => {
        const p = await r.launchAndLoad('blank');
        const evaluateAtReturn = async (returnValue, expression = '$returnValue') => {
            p.dap.evaluate({
                expression: `(function () {
          debugger;
          return ${returnValue};
        })();`,
            });
            const { threadId } = await p.dap.once('stopped');
            await p.dap.next({ threadId: threadId }); // step past debugger;
            await p.dap.once('stopped');
            await p.dap.next({ threadId: threadId }); // step past return;
            await p.dap.once('stopped');
            const frameId = (await p.dap.stackTrace({
                threadId: threadId,
            })).stackFrames[0].id;
            p.log(`return ${returnValue}:\n`);
            await p.logger.evaluateAndLog(expression, { params: { frameId } });
            await p.dap.continue({ threadId: threadId });
        };
        await evaluateAtReturn('42');
        await evaluateAtReturn('{ a: { b: true } }');
        await evaluateAtReturn('undefined');
        r.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('auto expands getter (#447)', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html', { __autoExpandGetters: true });
        // prototype-free objs just to avoid adding prototype noise to tests:
        await p.logger.evaluateAndLog(`Object.create({ set foo(x) {} })`, { depth: 2 });
        p.log('');
        await p.logger.evaluateAndLog(`Object.create({ get foo() { return 42 } })`, { depth: 2 });
        p.log('');
        await p.logger.evaluateAndLog(`Object.create({ get foo() { throw 'wat'; } })`, { depth: 2 });
        p.log('');
        await p.logger.evaluateAndLog(`Object.create({ normalObject: true })`, { depth: 2 });
        p.log('');
        p.assertLog();
    });
});
//# sourceMappingURL=evaluate.js.map
//# sourceMappingURL=evaluate.js.map
