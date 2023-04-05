"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('variables', () => {
    describe('basic', () => {
        testIntegrationUtils_1.itIntegrates('basic object', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            await p.logger.evaluateAndLog('({a: 1})');
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('simple log', async ({ r }) => {
            const p = await r.launch(`
        <script>
          console.log('Hello world');
        </script>`);
            p.load();
            await p.logger.logOutput(await p.dap.once('output'));
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('clear console', async ({ r }) => {
            let complete;
            const result = new Promise(f => (complete = f));
            let chain = Promise.resolve();
            const p = await r.launch(`
        <script>
        console.clear();
        console.log('Hello world');
        console.clear();
        console.clear();
        console.log('Hello world');
        console.clear();
        console.error('DONE');
        </script>`);
            p.load();
            p.dap.on('output', async (params) => {
                chain = chain.then(async () => {
                    if (params.category === 'stderr')
                        complete();
                    else
                        await p.logger.logOutput(params);
                });
            });
            await result;
            p.assertLog();
        });
    });
    describe('object', () => {
        testIntegrationUtils_1.itIntegrates('simple array', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            await p.logger.evaluateAndLog('var a = [1, 2, 3]; a.foo = 1; a', { logInternalInfo: true });
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates.skip('large array', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            await p.logger.evaluateAndLog('var a = new Array(110); a.fill(1); a', {
                logInternalInfo: true,
            });
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('get set', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            await p.logger.evaluateAndLog(`
        const a = {};
        Object.defineProperty(a, 'getter', { get: () => {} });
        Object.defineProperty(a, 'setter', { set: () => {} });
        Object.defineProperty(a, 'accessor', { get: () => {}, set: () => {} });
        a;`);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('private props', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            await p.logger.evaluateAndLog(`
        class A { #foo = 'bar' }
        new A();`);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('deep accessor', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            await p.logger.evaluateAndLog(`
        class Foo { get getter() {} }
        class Bar extends Foo { }
        new Bar();`);
            p.assertLog();
        });
        describe('customDescriptionGenerator', () => {
            testIntegrationUtils_1.itIntegrates('using function declaration', async ({ r }) => {
                const p = await r.launchAndLoad('blank', {
                    customDescriptionGenerator: 'function (def) { if (this.customDescription) return "using function: " + this.customDescription(); else return def }',
                });
                await p.logger.evaluateAndLog(`
          class Foo { get getter() {} }
          class Bar extends Foo { customDescription() { return 'Instance of bar'} }
          new Bar();`);
                p.assertLog();
            });
            testIntegrationUtils_1.itIntegrates('using statement syntax', async ({ r }) => {
                const p = await r.launchAndLoad('blank', {
                    customDescriptionGenerator: 'const hasCustomDescription = this.customDescription; "using statement: " + (hasCustomDescription ? this.customDescription() : defaultValue)',
                });
                await p.logger.evaluateAndLog(`
          class Foo { get getter() {} }
          class Bar extends Foo { customDescription() { return 'Instance of bar'} }
          new Bar();`);
                p.assertLog();
            });
            testIntegrationUtils_1.itIntegrates('using statement with return syntax', async ({ r }) => {
                const p = await r.launchAndLoad('blank', {
                    customDescriptionGenerator: 'const hasCustomDescription = this.customDescription; if (hasCustomDescription) { return "using statement return: " + this.customDescription() } else return defaultValue',
                });
                await p.logger.evaluateAndLog(`
          class Foo { get getter() {} }
          class Bar extends Foo { customDescription() { return 'Instance of bar'} }
          new Bar();`);
                p.assertLog();
            });
            testIntegrationUtils_1.itIntegrates('with arrays', async ({ r }) => {
                const p = await r.launchAndLoad('blank', {
                    customDescriptionGenerator: `function (def) {
              return this.customDescription
                ? this.customDescription()
                : (Array.isArray(this)
                  ? "I'm an array"
                  : def); }`,
                });
                await p.logger.evaluateAndLog(`
          class Foo { get getter() {} }
          class Bar extends Foo { customDescription() { return 'Instance of bar'} }
          [new Bar(), new Foo(), 5, "test"];`);
                p.assertLog();
            });
        });
        describe('customPropertiesGenerator', () => {
            testIntegrationUtils_1.itIntegrates('works with customPropertiesGenerator method ', async ({ r }) => {
                const p = await r.launchAndLoad('blank', {
                    customPropertiesGenerator: 'function () { if (this.customPropertiesGenerator) return this.customPropertiesGenerator(); else return this; }',
                });
                await p.logger.evaluateAndLog(`
        class Foo { get getter() {} }
        class Bar extends Foo {
          constructor() {
            super();
            this.realProp = 'cc3';
          }

          customPropertiesGenerator() {
            const properties = Object.create(this.__proto__);
            return Object.assign(properties, this, { customProp1: 'aa1', customProp2: 'bb2' });
          }
        }
        new Bar();`);
                p.assertLog();
            });
        });
        testIntegrationUtils_1.itIntegrates('shows errors while generating properties', async ({ r }) => {
            const p = await r.launchAndLoad('blank', {
                customPropertiesGenerator: 'function () { if (this.customPropertiesGenerator) throw new Error("Some error while generating properties"); else return this; }',
            });
            await p.logger.evaluateAndLog(`
      class Foo { get getter() {} }
      class Bar extends Foo {
        constructor() {
          super();
          this.realProp = 'cc3';
        }

        customPropertiesGenerator() {
          const properties = Object.create(this.__proto__);
          return Object.assign(properties, this, { customProp1: 'aa1', customProp2: 'bb2' });
        }
      }
      new Bar();`);
            p.assertLog();
        });
    });
    describe('web', () => {
        testIntegrationUtils_1.itIntegrates('tags', async ({ r }) => {
            const p = await r.launchAndLoad(`<head>
        <meta name='foo' content='bar'></meta>
        <title>Title</title>
      </head>`);
            await p.logger.evaluateAndLog('document.head.children');
            p.assertLog();
        });
    });
    describe('multiple threads', () => {
        testIntegrationUtils_1.itIntegrates('worker', async ({ r }) => {
            const p = await r.launchUrlAndLoad('worker.html');
            const outputs = [];
            await Promise.all([
                (async () => outputs.push({ output: await p.dap.once('output'), logger: p.logger }))(),
                (async () => {
                    const worker = await r.worker();
                    outputs.push({ output: await worker.dap.once('output'), logger: worker.logger });
                    outputs.push({ output: await worker.dap.once('output'), logger: worker.logger });
                })(),
            ]);
            outputs.sort((a, b) => {
                var _a, _b, _c, _d;
                const aName = (_b = (_a = a === null || a === void 0 ? void 0 : a.output) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.name;
                const bName = (_d = (_c = b === null || b === void 0 ? void 0 : b.output) === null || _c === void 0 ? void 0 : _c.source) === null || _d === void 0 ? void 0 : _d.name;
                return aName && bName ? aName.localeCompare(bName) : 0;
            });
            for (const { output, logger } of outputs)
                await logger.logOutput(output);
            p.assertLog();
        });
    });
    describe('setVariable', () => {
        testIntegrationUtils_1.itIntegrates.skip('basic', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            const v = await p.logger.evaluateAndLog(`window.x = ({foo: 42}); x`);
            p.log(`\nSetting "foo" to "{bar: 17}"`);
            const response = await p.dap.setVariable({
                variablesReference: v.variablesReference,
                name: 'foo',
                value: '{bar: 17}',
            });
            const v2 = Object.assign(Object.assign({}, response), { variablesReference: response.variablesReference || 0, name: '<result>' });
            await p.logger.logVariable(v2);
            p.log(`\nOriginal`);
            await p.logger.logVariable(v);
            p.log(await p.dap.setVariable({
                variablesReference: v.variablesReference,
                name: 'foo',
                value: 'baz',
            }), '\nsetVariable failure: ');
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('scope', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            p.cdp.Runtime.evaluate({
                expression: `
        (function foo() {
          let y = 'value of y';
          let z = 'value of z';
          debugger;
        })()
      `,
            });
            const paused = p.log(await p.dap.once('stopped'), 'stopped: ');
            const stack = await p.dap.stackTrace({ threadId: paused.threadId });
            const scopes = await p.dap.scopes({ frameId: stack.stackFrames[0].id });
            const scope = scopes.scopes[0];
            const v = {
                name: 'scope',
                value: scope.name,
                variablesReference: scope.variablesReference,
                namedVariables: scope.namedVariables,
                indexedVariables: scope.indexedVariables,
            };
            await p.logger.logVariable(v);
            p.log(`\nSetting "y" to "z"`);
            const response = await p.dap.setVariable({
                variablesReference: v.variablesReference,
                name: 'y',
                value: `z`,
            });
            const v2 = Object.assign(Object.assign({}, response), { variablesReference: response.variablesReference || 0, name: '<result>' });
            await p.logger.logVariable(v2);
            p.log(`\nOriginal`);
            await p.logger.logVariable(v);
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('name mapping', async ({ r }) => {
            const p = await r.launchUrlAndLoad('minified/index.html');
            p.cdp.Runtime.evaluate({ expression: `test()` });
            const event = await p.dap.once('stopped');
            await p.logger.logStackTrace(event.threadId, true);
            await p.dap.continue({ threadId: event.threadId });
            p.assertLog();
        });
        testIntegrationUtils_1.itIntegrates('evaluateName', async ({ r }) => {
            const p = await r.launchAndLoad('blank');
            p.cdp.Runtime.evaluate({
                expression: `
        (function foo() {
          let a = 'some string';
          let b = [1, 2, 3, 4];
          b.prop = '';
          let c = { $a: 1, _b: 2, c: 3, 'd d': 4, [42]: 5,
            e: { nested: [{ obj: true }]}, [Symbol('wut')]: 'wut' };
          debugger;
        })();
      `,
            });
            const paused = p.log(await p.dap.once('stopped'), 'stopped: ');
            const stack = await p.dap.stackTrace({ threadId: paused.threadId });
            const scopes = await p.dap.scopes({ frameId: stack.stackFrames[0].id });
            const scope = scopes.scopes[0];
            const v = {
                name: 'scope',
                value: scope.name,
                variablesReference: scope.variablesReference,
                namedVariables: scope.namedVariables,
                indexedVariables: scope.indexedVariables,
            };
            await logger_1.walkVariables(p.dap, v, (variable, depth) => {
                p.log('  '.repeat(depth) + variable.evaluateName);
                return variable.name !== '__proto__' && variable.name !== 'this';
            });
            p.assertLog();
        });
    });
});
//# sourceMappingURL=variablesTest.js.map
//# sourceMappingURL=variablesTest.js.map
