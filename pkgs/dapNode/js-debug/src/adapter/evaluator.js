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
exports.Evaluator = exports.IEvaluator = exports.returnValueStr = void 0;
const astring_1 = require("astring");
const crypto_1 = require("crypto");
const estraverse_1 = require("estraverse");
const inversify_1 = require("inversify");
const connection_1 = require("../cdp/connection");
const sourceCodeManipulations_1 = require("../common/sourceCodeManipulations");
const renameProvider_1 = require("../common/sourceMaps/renameProvider");
const templates_1 = require("./templates");
exports.returnValueStr = '$returnValue';
const hoistedPrefix = '__js_debug_hoisted_';
const makeHoistedName = () => hoistedPrefix + crypto_1.randomBytes(8).toString('hex');
exports.IEvaluator = Symbol('IEvaluator');
/**
 * Evaluation wraps CDP evaluation requests with additional functionality.
 */
let Evaluator = class Evaluator {
    constructor(cdp, renameProvider) {
        this.cdp = cdp;
        this.renameProvider = renameProvider;
    }
    /**
     * @inheritdoc
     */
    get hasReturnValue() {
        return !!this.returnValue;
    }
    /**
     * @inheritdoc
     */
    setReturnedValue(value) {
        this.returnValue = value;
    }
    /**
     * @inheritdoc
     */
    prepare(expression, { isInternalScript, hoist, renames } = {}) {
        if (isInternalScript !== false) {
            expression += templates_1.getSourceSuffix();
        }
        // CDP gives us a way to evaluate a function in the context of a given
        // object ID. What we do to make returnValue work is to hoist the return
        // object onto `globalThis`, replace reference in the expression, then
        // evalute the expression and unhoist it from the globals.
        const toHoist = new Map();
        toHoist.set(exports.returnValueStr, makeHoistedName());
        for (const key of hoist !== null && hoist !== void 0 ? hoist : []) {
            toHoist.set(key, makeHoistedName());
        }
        const { transformed, hoisted } = this.replaceVariableInExpression(expression, toHoist, renames);
        if (!hoisted.size) {
            return {
                canEvaluateDirectly: true,
                invoke: params => this.cdp.Debugger.evaluateOnCallFrame(Object.assign(Object.assign({}, params), { expression: transformed })),
            };
        }
        return {
            canEvaluateDirectly: false,
            invoke: (params, hoistMap = {}) => Promise.all([...toHoist].map(([ident, hoisted]) => this.hoistValue(ident === exports.returnValueStr ? this.returnValue : hoistMap[ident], hoisted))).then(() => this.cdp.Debugger.evaluateOnCallFrame(Object.assign(Object.assign({}, params), { expression: transformed }))),
        };
    }
    async evaluate(params, options) {
        // no call frame means there will not be any relevant $returnValue to reference
        if (!('callFrameId' in params)) {
            return this.cdp.Runtime.evaluate(params);
        }
        let prepareOptions = options;
        if (options === null || options === void 0 ? void 0 : options.stackFrame) {
            const mapping = await this.renameProvider.provideOnStackframe(options.stackFrame);
            prepareOptions = Object.assign(Object.assign({}, prepareOptions), { renames: { mapping, position: options.stackFrame.rawPosition } });
        }
        return this.prepare(params.expression, prepareOptions).invoke(params);
    }
    /**
     * Hoists the return value of the expression to the `globalThis`.
     */
    async hoistValue(object, hoistedVar) {
        const objectId = object === null || object === void 0 ? void 0 : object.objectId;
        const dehoist = `setTimeout(() => { delete globalThis.${hoistedVar} }, 0)`;
        if (objectId) {
            await this.cdp.Runtime.callFunctionOn({
                objectId,
                functionDeclaration: `function() { globalThis.${hoistedVar} = this; ${dehoist}; ${templates_1.getSourceSuffix()} }`,
            });
        }
        else {
            await this.cdp.Runtime.evaluate({
                expression: `globalThis.${hoistedVar} = ${JSON.stringify(object === null || object === void 0 ? void 0 : object.value)};` +
                    `${dehoist};` +
                    templates_1.getSourceSuffix(),
            });
        }
    }
    /**
     * Replaces a variable in the given expression with the `hoisted` variable,
     * returning the identifiers which were hoisted.
     */
    replaceVariableInExpression(expr, hoistMap, renames) {
        const hoisted = new Set();
        let mutated = false;
        const replacement = (name, fallback) => ({
            type: 'ConditionalExpression',
            test: {
                type: 'BinaryExpression',
                left: {
                    type: 'UnaryExpression',
                    operator: 'typeof',
                    prefix: true,
                    argument: { type: 'Identifier', name },
                },
                operator: '!==',
                right: { type: 'Literal', value: 'undefined' },
            },
            consequent: { type: 'Identifier', name },
            alternate: fallback,
        });
        const parents = [];
        const transformed = estraverse_1.replace(sourceCodeManipulations_1.parseProgram(expr), {
            enter(node) {
                const asAcorn = node;
                if (node.type !== 'Identifier' || expr[asAcorn.start - 1] === '.') {
                    return;
                }
                const hoistName = hoistMap.get(node.name);
                if (hoistName) {
                    hoisted.add(node.name);
                    mutated = true;
                    this.skip();
                    return replacement(hoistName, undefinedExpression);
                }
                const cname = renames === null || renames === void 0 ? void 0 : renames.mapping.getCompiledName(node.name, renames.position);
                if (cname) {
                    mutated = true;
                    this.skip();
                    return replacement(cname, node);
                }
            },
            leave: () => {
                parents.pop();
            },
        });
        return { hoisted, transformed: mutated ? astring_1.generate(transformed) : expr };
    }
};
Evaluator = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.ICdpApi)),
    __param(1, inversify_1.inject(renameProvider_1.IRenameProvider))
], Evaluator);
exports.Evaluator = Evaluator;
const undefinedExpression = {
    type: 'Identifier',
    name: 'undefined',
};
//# sourceMappingURL=evaluator.js.map
//# sourceMappingURL=evaluator.js.map
