"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Completions = exports.ICompletions = void 0;
const acorn_loose_1 = require("acorn-loose");
const estraverse_1 = require("estraverse");
const inversify_1 = require("inversify");
const connection_1 = require("../cdp/connection");
const sourceCodeManipulations_1 = require("../common/sourceCodeManipulations");
const stringUtils_1 = require("../common/stringUtils");
const evaluator_1 = require("./evaluator");
const enumerateProperties_1 = require("./templates/enumerateProperties");
/**
 * Tries to infer the completion kind for the given Acorn node.
 */
const inferCompletionInfoForDeclaration = (node) => {
    var _a, _b, _c;
    switch (node.type) {
        case 'ClassDeclaration':
        case 'ClassExpression':
            return { type: "class" /* Class */, id: node.id };
        case 'MethodDefinition':
            return {
                type: ((_a = node.key) === null || _a === void 0 ? void 0 : _a.type) === 'Identifier' && node.key.name === 'constructor'
                    ? "constructor" /* Constructor */
                    : "method" /* Method */,
                id: node.key,
            };
        case 'VariableDeclarator':
            return {
                type: ((_b = node.init) === null || _b === void 0 ? void 0 : _b.type) === 'FunctionExpression' || ((_c = node.init) === null || _c === void 0 ? void 0 : _c.type) === 'ArrowFunctionExpression'
                    ? "function" /* Function */
                    : "variable" /* Variable */,
                id: node.id,
            };
    }
};
function maybeHasSideEffects(node) {
    let result = false;
    estraverse_1.traverse(node, {
        enter(node) {
            if (node.type === 'CallExpression' ||
                node.type === 'NewExpression' ||
                (node.type === 'UnaryExpression' && node.operator === 'delete') ||
                node.type === 'ClassBody') {
                result = true;
                return estraverse_1.VisitorOption.Break;
            }
        },
    });
    return result;
}
exports.ICompletions = Symbol('ICompletions');
/**
 * Provides REPL completions for the debug session.
 */
let Completions = class Completions {
    constructor(evaluator, cdp) {
        this.evaluator = evaluator;
        this.cdp = cdp;
    }
    async completions(options) {
        const source = sourceCodeManipulations_1.parseProgram(options.expression);
        const offset = new stringUtils_1.PositionToOffset(options.expression).convert(options.position);
        let candidate = () => Promise.resolve([]);
        estraverse_1.traverse(source, {
            enter: node => {
                const asAcorn = node;
                if (asAcorn.start < offset && offset <= asAcorn.end) {
                    if (node.type === 'Identifier') {
                        candidate = () => this.identifierCompleter(options, source, node, offset);
                    }
                    else if (node.type === 'MemberExpression') {
                        candidate = node.computed
                            ? () => this.elementAccessCompleter(options, node, offset)
                            : () => this.propertyAccessCompleter(options, node, offset);
                    }
                }
            },
        });
        return candidate().then(v => v.sort((a, b) => (a.sortText > b.sortText ? 1 : -1)));
    }
    /**
     * Completer for a TS element access, via bracket syntax.
     */
    async elementAccessCompleter(options, node, offset) {
        if (node.property.type !== 'Literal' || typeof node.property.value !== 'string') {
            // If this is not a string literal, either they're typing a number (where
            // autocompletion would be quite silly) or a complex expression where
            // trying to complete by property name is inappropriate.
            return [];
        }
        const prefix = options.expression.slice(sourceCodeManipulations_1.getStart(node.property) + 1, offset);
        const completions = await this.defaultCompletions(options, prefix);
        // Filter out the array access, adjust replacement ranges
        return completions
            .filter(c => c.sortText !== '~~[')
            .map(item => {
            var _a;
            return (Object.assign(Object.assign({}, item), { text: JSON.stringify((_a = item.text) !== null && _a !== void 0 ? _a : item.label) + ']', start: sourceCodeManipulations_1.getStart(node.property), length: sourceCodeManipulations_1.getEnd(node.property) - sourceCodeManipulations_1.getStart(node.property) }));
        });
    }
    /**
     * Completer for an arbitrary identifier.
     */
    async identifierCompleter(options, source, node, offset) {
        // Walk through the expression and look for any locally-declared variables or identifiers.
        const localIdentifiers = [];
        estraverse_1.traverse(source, {
            enter(node) {
                var _a;
                const completion = inferCompletionInfoForDeclaration(node);
                if (((_a = completion === null || completion === void 0 ? void 0 : completion.id) === null || _a === void 0 ? void 0 : _a.type) === 'Identifier') {
                    localIdentifiers.push({
                        label: completion.id.name,
                        type: completion.type,
                        sortText: completion.id.name,
                    });
                }
            },
        });
        const prefix = options.expression.slice(sourceCodeManipulations_1.getStart(node), offset);
        const completions = [...localIdentifiers, ...(await this.defaultCompletions(options, prefix))];
        if (this.evaluator.hasReturnValue &&
            options.executionContextId !== undefined &&
            evaluator_1.returnValueStr.startsWith(prefix)) {
            completions.push({
                sortText: `~${evaluator_1.returnValueStr}`,
                label: evaluator_1.returnValueStr,
                type: 'variable',
            });
        }
        return completions;
    }
    /**
     * Completes a property access on an object.
     */
    async propertyAccessCompleter(options, node, offset) {
        const { result, isArray } = await this.completePropertyAccess({
            executionContextId: options.executionContextId,
            stackFrame: options.stackFrame,
            expression: sourceCodeManipulations_1.getText(options.expression, node.object),
            prefix: acorn_loose_1.isDummy(node.property)
                ? ''
                : options.expression.slice(sourceCodeManipulations_1.getStart(node.property), offset),
            // If we see the expression might have a side effect, still try to get
            // completions, but tell V8 to throw if it sees a side effect. This is a
            // fairly conservative checker, we don't enable it if not needed.
            throwOnSideEffect: maybeHasSideEffects(node),
        });
        const start = sourceCodeManipulations_1.getStart(node.property) - 1;
        // For any properties are aren't valid identifiers, (erring on the side of
        // caution--not checking unicode and such), quote them as foo['bar!']
        const validIdentifierRe = /^[$a-z_][0-9a-z_$]*$/i;
        for (const item of result) {
            if (!validIdentifierRe.test(item.label)) {
                item.text = `[${JSON.stringify(item.label)}]`;
                item.start = start;
                item.length = 1;
            }
        }
        if (isArray) {
            const placeholder = 'index';
            result.unshift({
                label: `[${placeholder}]`,
                text: `[${placeholder}]`,
                type: 'property',
                sortText: '~~[',
                start,
                selectionStart: 1,
                selectionLength: placeholder.length,
                length: 1,
            });
        }
        return result;
    }
    async completePropertyAccess({ executionContextId, stackFrame, expression, prefix, isInGlobalScope = false, throwOnSideEffect = false, }) {
        const params = {
            expression: `(${expression})`,
            objectGroup: 'console',
            silent: true,
            throwOnSideEffect,
        };
        const callFrameId = stackFrame && stackFrame.callFrameId();
        const objRefResult = await this.evaluator.evaluate(callFrameId ? Object.assign(Object.assign({}, params), { callFrameId }) : Object.assign(Object.assign({}, params), { contextId: executionContextId }), { stackFrame });
        if (!objRefResult || objRefResult.exceptionDetails) {
            return { result: [], isArray: false };
        }
        // No object ID indicates a primitive. Call enumeration on the value
        // directly. We don't do this all the time, since our enumeration logic
        // triggers Chrome's side-effect detect and fails.
        if (!objRefResult.result.objectId) {
            const primitiveParams = Object.assign(Object.assign({}, params), { returnByValue: true, throwOnSideEffect: false, expression: enumerateProperties_1.enumeratePropertiesTemplate(`(${expression})`, JSON.stringify(prefix), JSON.stringify(isInGlobalScope)) });
            const propsResult = await this.evaluator.evaluate(callFrameId
                ? Object.assign(Object.assign({}, primitiveParams), { callFrameId }) : Object.assign(Object.assign({}, primitiveParams), { contextId: executionContextId }));
            return !propsResult || propsResult.exceptionDetails
                ? { result: [], isArray: false }
                : propsResult.result.value;
        }
        // Otherwise, invoke the property enumeration on the returned object ID.
        try {
            const propsResult = await enumerateProperties_1.enumerateProperties({
                cdp: this.cdp,
                args: [undefined, prefix, isInGlobalScope],
                objectId: objRefResult.result.objectId,
                returnByValue: true,
            });
            return propsResult.value;
        }
        catch (_a) {
            return { result: [], isArray: false };
        }
        finally {
            this.cdp.Runtime.releaseObject({ objectId: objRefResult.result.objectId }); // no await
        }
    }
    /**
     * Returns completion for globally scoped variables. Used for a fallback
     * if we can't find anything more specific to complete.
     */
    async defaultCompletions(options, prefix = '') {
        for (const global of ['self', 'global', 'this']) {
            const { result: items } = await this.completePropertyAccess({
                executionContextId: options.executionContextId,
                stackFrame: options.stackFrame,
                expression: global,
                prefix,
                isInGlobalScope: true,
            });
            if (!items.length) {
                continue;
            }
            if (options.stackFrame) {
                // When evaluating on a call frame, also autocomplete with scope variables.
                const names = new Set(items.map(item => item.label));
                for (const completion of await options.stackFrame.completions()) {
                    if (names.has(completion.label))
                        continue;
                    names.add(completion.label);
                    items.push(completion);
                }
            }
            items.push(...this.syntheticCompletions(options, prefix));
            return items;
        }
        return this.syntheticCompletions(options, prefix);
    }
    syntheticCompletions(_options, prefix) {
        if (this.evaluator.hasReturnValue && evaluator_1.returnValueStr.startsWith(prefix)) {
            return [
                {
                    sortText: `~${evaluator_1.returnValueStr}`,
                    label: evaluator_1.returnValueStr,
                    type: 'variable',
                },
            ];
        }
        return [];
    }
};
Completions = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(evaluator_1.IEvaluator)),
    __param(1, inversify_1.inject(connection_1.ICdpApi))
], Completions);
exports.Completions = Completions;
//# sourceMappingURL=completions.js.map
//# sourceMappingURL=completions.js.map
