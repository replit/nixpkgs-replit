"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyntaxErrorIn = exports.getOptimalCompiledPosition = exports.checkContentHash = exports.parseSourceMappingUrl = exports.wrapObjectLiteral = exports.rewriteTopLevelAwait = exports.prettyPrintAsSourceMap = void 0;
const acorn_1 = require("acorn");
const astring_1 = require("astring");
const estraverse_1 = require("estraverse");
const fs_1 = require("fs");
const source_map_1 = require("source-map");
const fsUtils_1 = require("./fsUtils");
const hash_1 = require("./hash");
const pathUtils_1 = require("./pathUtils");
const sourceCodeManipulations_1 = require("./sourceCodeManipulations");
const sourceMap_1 = require("./sourceMaps/sourceMap");
async function prettyPrintAsSourceMap(fileName, minified, compiledPath, sourceMapUrl) {
    const ast = acorn_1.Parser.parse(minified, { locations: true, ecmaVersion: 'latest' });
    const sourceMap = new source_map_1.SourceMapGenerator({ file: fileName });
    // provide a fake SourceMapGenerator since we want to actually add the
    // *reversed* mappings -- we're creating a fake 'original' source.
    const beautified = astring_1.generate(ast, {
        sourceMap: {
            setSourceContent: (file, content) => sourceMap.setSourceContent(file, content),
            applySourceMap: (smc, file, path) => sourceMap.applySourceMap(smc, file, path),
            toJSON: () => sourceMap.toJSON(),
            toString: () => sourceMap.toString(),
            addMapping: mapping => sourceMap.addMapping({
                generated: mapping.original,
                original: { column: mapping.generated.column, line: mapping.generated.line },
                source: fileName,
                name: mapping.name,
            }),
        },
    });
    sourceMap.setSourceContent(fileName, beautified);
    return new sourceMap_1.SourceMap(await source_map_1.SourceMapConsumer.fromSourceMap(sourceMap), {
        sourceMapUrl,
        compiledPath,
    }, '', [fileName]);
}
exports.prettyPrintAsSourceMap = prettyPrintAsSourceMap;
function rewriteTopLevelAwait(code) {
    let program;
    try {
        // todo: strict needed due to https://github.com/acornjs/acorn/issues/988
        program = sourceCodeManipulations_1.parseProgram(code, /* strict= */ true);
    }
    catch (e) {
        return undefined;
    }
    const makeAssignment = (id, rhs) => ({
        type: 'ExpressionStatement',
        expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: id,
            right: rhs,
        },
    });
    let containsAwait = false;
    let containsReturn = false;
    const replaced = estraverse_1.replace(program, {
        enter(node, parent) {
            switch (node.type) {
                case 'ClassDeclaration':
                    return makeAssignment(node.id || { type: 'Identifier', name: '_default' }, Object.assign(Object.assign({}, node), { type: 'ClassExpression' }));
                case 'FunctionDeclaration':
                    this.skip();
                    return makeAssignment(node.id || { type: 'Identifier', name: '_default' }, Object.assign(Object.assign({}, node), { type: 'FunctionExpression' }));
                case 'FunctionExpression':
                case 'ArrowFunctionExpression':
                case 'MethodDefinition':
                    return estraverse_1.VisitorOption.Skip;
                case 'AwaitExpression':
                    containsAwait = true;
                    return;
                case 'ForOfStatement':
                    if (node.await) {
                        containsAwait = true;
                    }
                    return;
                case 'ReturnStatement':
                    containsReturn = true;
                    return;
                case 'VariableDeclaration':
                    if (!parent || !('body' in parent) || !(parent.body instanceof Array)) {
                        return;
                    }
                    const stmts = parent.body;
                    const spliced = node.declarations.map((decl) => ({
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'UnaryExpression',
                            operator: 'void',
                            prefix: true,
                            argument: {
                                type: 'AssignmentExpression',
                                operator: '=',
                                left: decl.id,
                                right: decl.init || { type: 'Identifier', name: 'undefined' },
                            },
                        },
                    }));
                    stmts.splice(stmts.indexOf(node), 1, ...spliced);
            }
        },
    });
    // Top-level return is not allowed.
    if (!containsAwait || containsReturn) {
        return;
    }
    // If we expect the value (last statement is an expression),
    // return it from the inner function.
    const last = replaced.body[replaced.body.length - 1];
    if (last.type === 'ExpressionStatement') {
        replaced.body[replaced.body.length - 1] = {
            type: 'ReturnStatement',
            argument: last.expression,
        };
    }
    const fn = {
        type: 'ExpressionStatement',
        expression: {
            type: 'CallExpression',
            callee: {
                type: 'ArrowFunctionExpression',
                params: [],
                generator: false,
                expression: false,
                async: true,
                body: {
                    type: 'BlockStatement',
                    body: replaced.body,
                },
            },
            arguments: [],
            optional: false,
        },
    };
    return astring_1.generate(fn);
}
exports.rewriteTopLevelAwait = rewriteTopLevelAwait;
/**
 * If the given code is an object literal expression, like `{ foo: true }`,
 * wraps it with parens like `({ foo: true })`. Will return the input code
 * for other expression or invalid code.
 */
function wrapObjectLiteral(code) {
    try {
        const expr = acorn_1.parseExpressionAt(code, 0, sourceCodeManipulations_1.acornOptions);
        if (expr.end < code.length) {
            return code;
        }
        const cast = expr;
        if (cast.type !== 'ObjectExpression') {
            return code;
        }
        return `(${code})`;
    }
    catch (_a) {
        return code;
    }
}
exports.wrapObjectLiteral = wrapObjectLiteral;
function parseSourceMappingUrl(content) {
    if (!content)
        return;
    const name = 'sourceMappingURL';
    const length = content.length;
    const nameLength = name.length;
    let pos = length;
    let equalSignPos = 0;
    while (true) {
        pos = content.lastIndexOf(name, pos);
        if (pos === -1)
            return;
        // Check for a /\/[\/*][@#][ \t]/ regexp (length of 4) before found name.
        if (pos < 4)
            return;
        pos -= 4;
        if (content[pos] !== '/')
            continue;
        if (content[pos + 1] !== '/')
            continue;
        if (content[pos + 2] !== '#' && content[pos + 2] !== '@')
            continue;
        if (content[pos + 3] !== ' ' && content[pos + 3] !== '\t')
            continue;
        equalSignPos = pos + 4 + nameLength;
        if (equalSignPos < length && content[equalSignPos] !== '=')
            continue;
        break;
    }
    let sourceMapUrl = content.substring(equalSignPos + 1);
    const newLine = sourceMapUrl.indexOf('\n');
    if (newLine !== -1)
        sourceMapUrl = sourceMapUrl.substring(0, newLine);
    sourceMapUrl = sourceMapUrl.trim();
    for (let i = 0; i < sourceMapUrl.length; ++i) {
        if (sourceMapUrl[i] === '"' ||
            sourceMapUrl[i] === "'" ||
            sourceMapUrl[i] === ' ' ||
            sourceMapUrl[i] === '\t')
            return;
    }
    return sourceMapUrl;
}
exports.parseSourceMappingUrl = parseSourceMappingUrl;
const hasher = new hash_1.Hasher();
async function checkContentHash(absolutePath, contentHash, contentOverride) {
    if (!absolutePath) {
        return undefined;
    }
    if (pathUtils_1.isWithinAsar(absolutePath)) {
        return undefined;
    }
    if (!contentHash) {
        const exists = await new fsUtils_1.LocalFsUtils(fs_1.promises).exists(absolutePath);
        return exists ? absolutePath : undefined;
    }
    const result = typeof contentOverride === 'string'
        ? await hasher.verifyBytes(contentOverride, contentHash, true)
        : await hasher.verifyFile(absolutePath, contentHash, true);
    return result ? absolutePath : undefined;
}
exports.checkContentHash = checkContentHash;
/**
 * When calling `generatedPositionFor`, we may find non-exact matches. The
 * bias passed to the method controls which of the matches we choose.
 * Here, we will try to pick the position that maps back as closely as
 * possible to the source line if we get an approximate match,
 */
function getOptimalCompiledPosition(sourceUrl, uiLocation, map) {
    const prevLocation = map.generatedPositionFor({
        source: sourceUrl,
        line: uiLocation.lineNumber,
        column: uiLocation.columnNumber - 1,
        bias: source_map_1.SourceMapConsumer.GREATEST_LOWER_BOUND,
    });
    const getVariance = (position) => {
        if (position.line === null || position.column === null) {
            return 10e10;
        }
        const original = map.originalPositionFor(position);
        return original.line !== null ? Math.abs(uiLocation.lineNumber - original.line) : 10e10;
    };
    const prevVariance = getVariance(prevLocation);
    // allGeneratedLocations similar to a LEAST_UPPER_BOUND, except that it gets
    // all possible locations. From those, we choose the first-best option.
    const allLocations = map
        .allGeneratedPositionsFor({
        source: sourceUrl,
        line: uiLocation.lineNumber,
        column: uiLocation.columnNumber - 1,
    })
        .filter((loc) => loc.line !== null && loc.column !== null)
        .sort((a, b) => (a.line !== b.line ? a.line - b.line : a.column - b.column))
        .map((position) => [position, getVariance(position)]);
    allLocations.push([prevLocation, prevVariance]);
    // Sort again--sort is stable (de facto for a while, formalized in ECMA 2019),
    // so we get the first location that has the least variance, or if the variance is the same, the one that appears earliest.
    allLocations.sort(([a, varA], [b, varB]) => varA - varB || a.line - b.line || a.column - b.column);
    return allLocations[0][0];
}
exports.getOptimalCompiledPosition = getOptimalCompiledPosition;
/**
 * Returns the syntax error in the given code, if any.
 */
function getSyntaxErrorIn(code) {
    try {
        new Function(code);
    }
    catch (e) {
        return e;
    }
}
exports.getSyntaxErrorIn = getSyntaxErrorIn;
//# sourceMappingURL=sourceUtils.js.map
//# sourceMappingURL=sourceUtils.js.map
