"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const astring_1 = require("astring");
const chai_1 = require("chai");
const asserts_1 = require("../test/asserts");
const sourceCodeManipulations_1 = require("./sourceCodeManipulations");
describe('sourceCodeManipulations', () => {
    describe('statementsToFunction', () => {
        const wrapped = (...str) => [
            'function _generatedCode(a) {',
            '  try {',
            ...str,
            '  } catch (e) {',
            '    return e.stack || e.message || String(e);',
            '  }',
            '}',
        ].join('\n');
        const tcases = [
            {
                in: 'a',
                out: wrapped('return a;'),
            },
            {
                in: 'a += 2; return a',
                out: wrapped('a += 2;', 'return a;'),
            },
            {
                in: 'a += 2; a',
                out: wrapped('a += 2;', 'return a;'),
            },
            {
                in: 'function(x) { return x }',
                out: wrapped('return (function (x) { return x; }).call(this, a);'),
            },
        ];
        for (const { in: input, out } of tcases) {
            it(input, () => {
                const parsed = sourceCodeManipulations_1.parseSource(input);
                const transformed = sourceCodeManipulations_1.statementsToFunction(['a'], parsed, true);
                asserts_1.assertAstEqual(astring_1.generate(transformed), out);
            });
        }
    });
    it('functionToFunctionCall', () => {
        const parsed = sourceCodeManipulations_1.parseSource('function(x) { return x }');
        const transformed = sourceCodeManipulations_1.functionToFunctionCall(['x'], {
            type: 'FunctionExpression',
            id: null,
            params: [{ type: 'Identifier', name: 'x' }],
            body: parsed[0].body,
        });
        chai_1.expect(astring_1.generate(transformed)).to.equal(['(function (x) {', '  return x;', '})(x)'].join('\n'));
    });
});
//# sourceMappingURL=sourceCodeManipulations.test.js.map
//# sourceMappingURL=sourceCodeManipulations.test.js.map
