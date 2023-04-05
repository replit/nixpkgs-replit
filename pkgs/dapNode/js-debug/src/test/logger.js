"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.walkVariables = void 0;
const kOmitProperties = ['[[ArrayBufferData]]'];
/**
 * Runs the 'walker' function over the tree of variables, iterating in a depth-
 * first-search until walker returns false.
 */
exports.walkVariables = async (dap, variable, walker, depth = 0) => {
    if (!(await walker(variable, depth))) {
        return;
    }
    if (variable.variablesReference === undefined) {
        return;
    }
    const hasHints = typeof variable.namedVariables === 'number' || typeof variable.indexedVariables === 'number';
    if (hasHints) {
        if (variable.namedVariables) {
            const named = await dap.variables({
                variablesReference: variable.variablesReference,
                filter: 'named',
            });
            for (const variable of named.variables) {
                await exports.walkVariables(dap, variable, walker, depth + 1);
            }
        }
        if (variable.indexedVariables) {
            const indexed = await dap.variables({
                variablesReference: variable.variablesReference,
                filter: 'indexed',
                start: 0,
                count: variable.indexedVariables,
            });
            for (const variable of indexed.variables) {
                await exports.walkVariables(dap, variable, walker, depth + 1);
            }
        }
    }
    else {
        const all = await dap.variables({
            variablesReference: variable.variablesReference,
        });
        for (const variable of all.variables) {
            await exports.walkVariables(dap, variable, walker, depth + 1);
        }
    }
};
class Logger {
    constructor(dap, log) {
        this._dap = dap;
        this._log = log;
    }
    logAsConsole(text) {
        if (!text)
            return;
        if (text.endsWith('\n'))
            text = text.substring(0, text.length - 1);
        this._log(text);
    }
    logVariable(rootVariable, options = {}, baseIndent = '') {
        return exports.walkVariables(this._dap, rootVariable, (variable, depth) => {
            var _a, _b;
            if (kOmitProperties.includes(variable.name)) {
                return depth < ((_a = options.depth) !== null && _a !== void 0 ? _a : 1);
            }
            const name = variable.name ? `${variable.name}: ` : '';
            let value = variable.value || '';
            if (value.endsWith('\n'))
                value = value.substring(0, value.length - 1);
            const type = variable.type ? `type=${variable.type}` : '';
            const namedCount = variable.namedVariables ? ` named=${variable.namedVariables}` : '';
            const indexedCount = variable.indexedVariables ? ` indexed=${variable.indexedVariables}` : '';
            const indent = baseIndent + '    '.repeat(depth);
            const expanded = variable.variablesReference ? '> ' : '';
            let suffix = options.logInternalInfo ? `${type}${namedCount}${indexedCount}` : '';
            if (suffix)
                suffix = '  // ' + suffix;
            let line = `${expanded}${name}${value}`;
            if (line) {
                if (line.includes('\n'))
                    line = '\n' + line;
                this.logAsConsole(`${indent}${line}${suffix}`);
            }
            return depth < ((_b = options.depth) !== null && _b !== void 0 ? _b : 1);
        });
    }
    async logOutput(params, options) {
        if (params.group) {
            this.logAsConsole(`# group: ${params.group}`);
        }
        const prefix = `${params.category}> `;
        if (params.output) {
            this.logAsConsole(`${prefix}${params.output}`);
        }
        if (params.variablesReference) {
            const result = await this._dap.variables({ variablesReference: params.variablesReference });
            for (const variable of result.variables)
                await this.logVariable(variable, options, prefix);
        }
    }
    async logEvaluateResult(result, options) {
        const variable = Object.assign({ name: 'result', value: result.result }, result);
        await this.logVariable(variable, options);
        return variable;
    }
    async logStackTrace(threadId, withScopes) {
        const initial = await this._dap.stackTrace({ threadId });
        const stack = initial.stackFrames;
        let totalFrames = initial.totalFrames || stack.length;
        while (stack.length < totalFrames) {
            const response = await this._dap.stackTrace({
                threadId,
                startFrame: stack.length,
                levels: Math.min(20, totalFrames - stack.length),
            });
            stack.push(...response.stackFrames);
            if (response.totalFrames)
                totalFrames = Math.min(totalFrames, response.totalFrames);
        }
        let emptyLine = !!withScopes;
        for (const frame of stack) {
            if (emptyLine)
                this._log('');
            if (frame.presentationHint === 'label') {
                this._log(`----${frame.name}----`);
                emptyLine = false;
                continue;
            }
            const origin = frame.source && frame.source.presentationHint === 'deemphasize'
                ? ` <hidden: ${frame.source.origin || ''}>`
                : '';
            this._log(`${frame.name} @ ${frame.source ? frame.source.path : 'unknown'}:${frame.line}:${frame.column}${origin}`);
            if (!withScopes)
                continue;
            const scopes = await this._dap.scopes({ frameId: frame.id });
            if (typeof scopes === 'string') {
                this._log(`  scope error: ${scopes}`);
            }
            else {
                for (let i = 0; i < scopes.scopes.length; i++) {
                    const scope = scopes.scopes[i];
                    if (scope.expensive) {
                        this._log(`  scope #${i}: ${scope.name} [expensive]`);
                        continue;
                    }
                    await this.logVariable({
                        name: 'scope #' + i,
                        value: scope.name,
                        variablesReference: scope.variablesReference,
                        namedVariables: scope.namedVariables,
                        indexedVariables: scope.indexedVariables,
                    }, {}, '  ');
                }
            }
        }
        return stack;
    }
    async evaluateAndLog(expressions, options = {}, context) {
        if (typeof expressions === 'string') {
            const result = await this._dap.evaluate(Object.assign({ expression: expressions, context }, options.params));
            if (typeof result === 'string') {
                this._log(`<error>: ${result}`);
                return { name: 'result', value: result, variablesReference: 0 };
            }
            return await this.logEvaluateResult(result, options);
        }
        for (const expression of expressions) {
            this._log(`Evaluating: '${expression}'`);
            const evaluation = this._dap.evaluate({ expression, context });
            await this.logOutput(await this._dap.once('output'), options);
            await evaluation;
            this._log(``);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map
//# sourceMappingURL=logger.js.map
