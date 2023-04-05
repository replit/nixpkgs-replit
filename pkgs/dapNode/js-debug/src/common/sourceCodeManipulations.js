"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statementToExpression = exports.returnErrorsFromStatements = exports.functionToFunctionCall = exports.statementsToFunction = exports.parseSource = exports.parseProgram = exports.getText = exports.getEnd = exports.getStart = exports.acornOptions = void 0;
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const acorn_1 = require("acorn");
const acorn_loose_1 = require("acorn-loose");
exports.acornOptions = {
    ecmaVersion: 'latest',
    locations: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReserved: true,
    allowReturnOutsideFunction: true,
};
exports.getStart = node => node.start;
exports.getEnd = node => node.end;
exports.getText = (src, node) => src.slice(exports.getStart(node), exports.getEnd(node));
exports.parseProgram = (str, strict = false) => (strict ? acorn_1.parse : acorn_loose_1.parse)(str, exports.acornOptions);
exports.parseSource = str => {
    const parsed = exports.parseProgram(str);
    // acorn-loose adds a "dummy" identifier to function expressions parsing
    // as a program, which creates an invalid name. But this isn't actually necesary.
    for (const stmt of parsed.body) {
        if (stmt.type === 'FunctionDeclaration' && stmt.id && acorn_loose_1.isDummy(stmt.id)) {
            stmt.id = null;
        }
    }
    return parsed.body;
};
/**
 * function (params) { code } => function (params) { catchAndReturnErrors?(code) }
 * statement => function () { return catchAndReturnErrors?(return statement) }
 * statement; statement => function () { catchAndReturnErrors?(statement; return statement;) }
 * */
function statementsToFunction(parameterNames, statements, catchAndReturnErrors) {
    if (statements.length > 1 || statements[0].type !== 'FunctionDeclaration') {
        return statementToFunction(parameterNames, statements, true, catchAndReturnErrors);
    }
    return codeToFunctionExecutingCode(parameterNames, [
        {
            type: 'ReturnStatement',
            argument: {
                type: 'CallExpression',
                optional: false,
                arguments: [
                    { type: 'ThisExpression' },
                    ...parameterNames.map(name => ({ type: 'Identifier', name })),
                ],
                callee: {
                    type: 'MemberExpression',
                    property: { type: 'Identifier', name: 'call' },
                    computed: false,
                    optional: false,
                    object: {
                        type: 'FunctionExpression',
                        params: statements[0].params,
                        body: statements[0].body,
                    },
                },
            },
        },
    ], true, catchAndReturnErrors);
}
exports.statementsToFunction = statementsToFunction;
/**
 * code => (parameterNames) => return catchAndReturnErrors?(code)
 * */
const codeToFunctionExecutingCode = (parameterNames, body, preserveThis, catchAndReturnErrors) => {
    const param = { type: 'Identifier', name: 'e' };
    const innerWithTry = {
        type: 'TryStatement',
        block: { type: 'BlockStatement', body: body },
        handler: {
            type: 'CatchClause',
            param: param,
            body: {
                type: 'BlockStatement',
                body: [
                    {
                        type: 'ReturnStatement',
                        argument: {
                            type: 'LogicalExpression',
                            left: {
                                type: 'LogicalExpression',
                                left: {
                                    type: 'MemberExpression',
                                    object: param,
                                    property: { type: 'Identifier', name: 'stack' },
                                    computed: false,
                                    optional: false,
                                },
                                operator: '||',
                                right: {
                                    type: 'MemberExpression',
                                    object: param,
                                    property: { type: 'Identifier', name: 'message' },
                                    computed: false,
                                    optional: false,
                                },
                            },
                            operator: '||',
                            right: {
                                type: 'CallExpression',
                                callee: { type: 'Identifier', name: 'String' },
                                arguments: [param],
                                optional: false,
                            },
                        },
                    },
                ],
            },
        },
    };
    const inner = catchAndReturnErrors ? [innerWithTry] : body;
    return preserveThis
        ? {
            type: 'FunctionExpression',
            id: { type: 'Identifier', name: '_generatedCode' },
            params: parameterNames.map(name => ({ type: 'Identifier', name })),
            body: { type: 'BlockStatement', body: inner },
        }
        : {
            type: 'ArrowFunctionExpression',
            params: parameterNames.map(name => ({ type: 'Identifier', name })),
            expression: false,
            body: { type: 'BlockStatement', body: inner },
        };
};
/**
 * function (params) { code } => (function (params) { code })(argumentsText)
 * */
exports.functionToFunctionCall = (argumentsList, functionCode) => ({
    type: 'CallExpression',
    arguments: argumentsList.map(name => ({ type: 'Identifier', name })),
    callee: functionCode,
    optional: false,
});
/**
 * statement => catchAndReturnErrors(return statement);
 * statement; statement => catchAndReturnErrors(statement; return statement);
 * */
exports.returnErrorsFromStatements = (parameterNames, statements, preserveThis) => exports.functionToFunctionCall(parameterNames, statementToFunction(parameterNames, statements, preserveThis, /*catchAndReturnErrors*/ true));
/**
 * statement => function () { catchAndReturnErrors(return statement); }
 * statement; statement => function () { catchAndReturnErrors(statement; return statement); }
 * */
function statementToFunction(parameterNames, statements, preserveThis, catchAndReturnErrors) {
    const last = statements[statements.length - 1];
    if (last.type !== 'ReturnStatement') {
        const expr = statementToExpression(last);
        if (expr) {
            statements = [...statements.slice(0, -1), { type: 'ReturnStatement', argument: expr }];
        }
    }
    return codeToFunctionExecutingCode(parameterNames, statements, preserveThis, catchAndReturnErrors);
}
function statementToExpression(stmt) {
    switch (stmt.type) {
        case 'ExpressionStatement':
            return stmt.expression;
        case 'BlockStatement':
            return {
                type: 'CallExpression',
                arguments: [],
                callee: { type: 'ArrowFunctionExpression', params: [], expression: false, body: stmt },
                optional: false,
            };
        case 'ReturnStatement':
            return stmt.argument || undefined;
        default:
            return undefined;
    }
}
exports.statementToExpression = statementToExpression;
//# sourceMappingURL=sourceCodeManipulations.js.map
//# sourceMappingURL=sourceCodeManipulations.js.map
