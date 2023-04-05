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
exports.LogPointCompiler = void 0;
const astring_1 = require("astring");
const crypto_1 = require("crypto");
const inversify_1 = require("inversify");
const sourceCodeManipulations_1 = require("../../../common/sourceCodeManipulations");
const sourceUtils_1 = require("../../../common/sourceUtils");
const errors_1 = require("../../../dap/errors");
const protocolError_1 = require("../../../dap/protocolError");
const evaluator_1 = require("../../evaluator");
const runtimeLogPoint_1 = require("./runtimeLogPoint");
const simple_1 = require("./simple");
/**
 * Compiles log point expressions to breakpoints.
 */
let LogPointCompiler = class LogPointCompiler {
    constructor(evaluator) {
        this.evaluator = evaluator;
    }
    /**
     * Compiles the log point to an IBreakpointCondition.
     * @throws {ProtocolError} if the expression is invalid
     */
    compile(params, logMessage) {
        const expression = this.logMessageToExpression(logMessage);
        const err = sourceUtils_1.getSyntaxErrorIn(expression);
        if (err) {
            throw new protocolError_1.ProtocolError(errors_1.invalidBreakPointCondition(params, err.message));
        }
        const { canEvaluateDirectly, invoke } = this.evaluator.prepare(expression);
        if (canEvaluateDirectly) {
            return new simple_1.SimpleCondition(params, this.logMessageToExpression(logMessage));
        }
        return new runtimeLogPoint_1.RuntimeLogPoint(invoke);
    }
    serializeLogStatements(statements) {
        return sourceCodeManipulations_1.returnErrorsFromStatements([], statements, false);
    }
    /**
     * Converts the log message in the form of `hello {name}!` to an expression
     * like `console.log('hello %O!', name);` (with some extra wrapping). This is
     * used to implement logpoint breakpoints.
     */
    logMessageToExpression(msg) {
        const unescape = (str) => str.replace(/%/g, '%%');
        const formatParts = [];
        const args = [];
        let end = 0;
        // Parse each interpolated {code} in the message as a TS program. TS will
        // parse the first {code} as a "Block", the first statement in the program.
        // We want to reach to the end of that block and evaluate any code therein.
        while (true) {
            const start = msg.indexOf('{', end);
            if (start === -1) {
                formatParts.push(unescape(msg.slice(end)));
                break;
            }
            formatParts.push(unescape(msg.slice(end, start)));
            const [block] = sourceCodeManipulations_1.parseSource(msg.slice(start));
            end = start + block.end;
            // unclosed or empty bracket is not valid, emit it as text
            if (end - 1 === start + 1 || msg[end - 1] !== '}') {
                formatParts.push(unescape(msg.slice(start, end)));
                continue;
            }
            if (block.type !== 'BlockStatement') {
                break;
            }
            args.push(astring_1.generate(this.serializeLogStatements(block.body)));
            formatParts.push('%O');
        }
        const result = `console.log(${[JSON.stringify(formatParts.join('')), ...args].join(', ')})`;
        const hash = crypto_1.createHash('sha1').update(result).digest('hex').slice(0, 7);
        return result + `\n//# sourceURL=logpoint-${hash}.cdp`;
    }
};
LogPointCompiler = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(evaluator_1.IEvaluator))
], LogPointCompiler);
exports.LogPointCompiler = LogPointCompiler;
//# sourceMappingURL=logPoint.js.map
//# sourceMappingURL=logPoint.js.map
