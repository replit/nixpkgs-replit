"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageFormatters = exports.formatAsTable = exports.previewException = exports.internalPropertyWeight = exports.privatePropertyWeight = exports.propertyWeight = exports.previewRemoteObject = exports.isArray = exports.previewAsObject = exports.subtypesWithoutPreview = void 0;
const budgetStringBuilder_1 = require("../../common/budgetStringBuilder");
const stringUtils = __importStar(require("../../common/stringUtils"));
const messageFormat = __importStar(require("../messageFormat"));
const contexts_1 = require("./contexts");
const maxArrowFunctionCharacterLength = 30;
const maxPropertyPreviewLength = 100;
const maxEntryPreviewLength = 20;
const maxExceptionTitleLength = 10000;
const minTableCellWidth = 3;
const maxTableWidth = 120;
/**
 * Object subtypes that should be rendered without any preview.
 */
exports.subtypesWithoutPreview = new Set([
    'null',
    'regexp',
    'date',
]);
/**
 * Returns whether the given type should be previewed as an expandable
 * object.
 */
function previewAsObject(object) {
    return (object.type === 'function' ||
        (object.type === 'object' && !exports.subtypesWithoutPreview.has(object.subtype)));
}
exports.previewAsObject = previewAsObject;
function isArray(object) {
    return object.subtype === 'array' || object.subtype === 'typedarray';
}
exports.isArray = isArray;
function previewRemoteObject(object, contextType) {
    var _a, _b;
    const context = contexts_1.getContextForType(contextType);
    const result = previewRemoteObjectInternal(object, context);
    return (_b = (_a = context.postProcess) === null || _a === void 0 ? void 0 : _a.call(context, result)) !== null && _b !== void 0 ? _b : result;
}
exports.previewRemoteObject = previewRemoteObject;
function previewRemoteObjectInternal(object, context) {
    // Evaluating function does not produce preview object for it.
    if (object.type === 'function') {
        return formatFunctionDescription(object.description, context.budget);
    }
    if (object.type === 'object' && object.subtype === 'node') {
        return object.description;
    }
    return 'preview' in object && object.preview
        ? renderPreview(object.preview, context.budget)
        : renderValue(object, context.budget, context.quoted);
}
function propertyWeight(prop) {
    if (prop.name === '__proto__')
        return 0;
    if (prop.name.startsWith('__'))
        return 1;
    return 100;
}
exports.propertyWeight = propertyWeight;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function privatePropertyWeight(_prop) {
    return 20;
}
exports.privatePropertyWeight = privatePropertyWeight;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function internalPropertyWeight(_prop) {
    return 10;
}
exports.internalPropertyWeight = internalPropertyWeight;
function renderPreview(preview, characterBudget) {
    if (isArray(preview)) {
        return renderArrayPreview(preview, characterBudget);
    }
    if (preview.subtype === 'internal#entry') {
        return stringUtils.trimEnd(preview.description || '', characterBudget);
    }
    if (preview.type === 'function') {
        return formatFunctionDescription(preview.description, characterBudget);
    }
    if (previewAsObject(preview)) {
        return renderObjectPreview(preview, characterBudget);
    }
    return renderPrimitivePreview(preview, characterBudget);
}
function renderArrayPreview(preview, characterBudget) {
    const builder = new budgetStringBuilder_1.BudgetStringBuilder(characterBudget);
    let description = preview.description;
    const match = description.match(/[^(]*\(([\d]+)\)/);
    if (!match)
        return description;
    const arrayLength = parseInt(match[1], 10);
    if (description.startsWith('Array('))
        description = description.substring('Array'.length);
    builder.append(stringUtils.trimEnd(description, builder.budget()));
    builder.append(' ');
    const propsBuilder = new budgetStringBuilder_1.BudgetStringBuilder(builder.budget() - 2, ', '); // for []
    // Indexed
    let lastIndex = -1;
    for (const prop of preview.properties) {
        if (!propsBuilder.checkBudget())
            break;
        if (isNaN(prop.name))
            continue;
        const index = parseInt(prop.name, 10);
        if (index > lastIndex + 1)
            propsBuilder.appendEllipsis();
        lastIndex = index;
        propsBuilder.append(renderPropertyPreview(prop, propsBuilder.budget()));
    }
    if (arrayLength > lastIndex + 1)
        propsBuilder.appendEllipsis();
    // Named
    for (const prop of preview.properties) {
        if (!propsBuilder.checkBudget())
            break;
        if (!isNaN(prop.name))
            continue;
        propsBuilder.append(renderPropertyPreview(prop, propsBuilder.budget(), prop.name));
    }
    if (preview.overflow)
        propsBuilder.appendEllipsis();
    builder.append('[' + propsBuilder.build() + ']');
    return builder.build();
}
function renderObjectPreview(preview, characterBudget) {
    const builder = new budgetStringBuilder_1.BudgetStringBuilder(characterBudget, ' ');
    if (preview.description !== 'Object')
        builder.append(stringUtils.trimEnd(preview.description, builder.budget()));
    const map = new Map();
    const properties = preview.properties || [];
    for (const prop of properties) {
        map.set(prop.name, prop);
    }
    // Handle boxed values such as Number, String.
    const primitiveValue = map.get('[[PrimitiveValue]]');
    if (primitiveValue) {
        builder.append(`(${renderPropertyPreview(primitiveValue, builder.budget() - 2)})`);
        return builder.build();
    }
    // Promise handling.
    const promiseStatus = map.get('[[PromiseStatus]]');
    const promiseValue = map.get('[[PromiseValue]]');
    if (promiseStatus && promiseValue) {
        if (promiseStatus.value === 'pending')
            builder.append(`{<${promiseStatus.value}>}`);
        else
            builder.append(`{${renderPropertyPreview(promiseValue, builder.budget() - 2, `<${promiseStatus.value}>`)}}`);
        return builder.build();
    }
    // Generator handling.
    const generatorStatus = map.get('[[GeneratorStatus]]');
    if (generatorStatus) {
        builder.append(`{<${generatorStatus.value}>}`);
        return builder.build();
    }
    const propsBuilder = new budgetStringBuilder_1.BudgetStringBuilder(builder.budget() - 2, ', '); // for '{}'
    for (const prop of properties) {
        if (!propsBuilder.checkBudget())
            break;
        propsBuilder.append(renderPropertyPreview(prop, propsBuilder.budget(), prop.name));
    }
    for (const entry of preview.entries || []) {
        if (!propsBuilder.checkBudget()) {
            break;
        }
        if (entry.key) {
            const key = renderPreview(entry.key, Math.min(maxEntryPreviewLength, propsBuilder.budget()));
            const value = renderPreview(entry.value, Math.min(maxEntryPreviewLength, propsBuilder.budget() - key.length - 4));
            propsBuilder.append(appendKeyValue(key, ' => ', value, propsBuilder.budget()));
        }
        else {
            propsBuilder.append(renderPreview(entry.value, Math.min(maxEntryPreviewLength, propsBuilder.budget())));
        }
    }
    if (preview.overflow) {
        propsBuilder.appendEllipsis();
    }
    const text = propsBuilder.build();
    if (text) {
        builder.append('{' + text + '}');
    }
    else if (builder.isEmpty()) {
        builder.append('{}');
    }
    return builder.build();
}
function valueOrEllipsis(value, characterBudget) {
    return value.length <= characterBudget ? value : '…';
}
function truncateValue(value, characterBudget) {
    return value.length >= characterBudget ? value.slice(0, characterBudget - 1) + '…' : value;
}
/**
 * Renders a preview of a primitive (number, undefined, null, string, etc) type.
 */
function renderPrimitivePreview(preview, characterBudget) {
    var _a;
    if (preview.type === 'object' && preview.subtype === 'null') {
        return valueOrEllipsis('null', characterBudget);
    }
    if (preview.type === 'undefined') {
        return valueOrEllipsis('undefined', characterBudget);
    }
    if (preview.type === 'string') {
        return stringUtils.trimMiddle((_a = preview.description) !== null && _a !== void 0 ? _a : preview.value, characterBudget);
    }
    return truncateValue(preview.description || '', characterBudget);
}
function appendKeyValue(key, separator, value, characterBudget) {
    if (key === undefined)
        return stringUtils.trimMiddle(value, characterBudget);
    if (key.length + separator.length > characterBudget)
        return stringUtils.trimEnd(key, characterBudget);
    return `${key}${separator}${stringUtils.trimMiddle(value, characterBudget - key.length - separator.length)}`; // Keep in sync with characterBudget calculation.
}
function renderPropertyPreview(prop, characterBudget, name) {
    var _a;
    characterBudget = Math.min(characterBudget, maxPropertyPreviewLength);
    if (prop.type === 'function')
        return appendKeyValue(name, ': ', 'ƒ', characterBudget); // Functions don't carry preview.
    if (prop.type === 'object' && prop.value === 'Object')
        return appendKeyValue(name, ': ', '{\u2026}', characterBudget);
    if (typeof prop.value === 'undefined')
        return appendKeyValue(name, ': ', `<${prop.type}>`, characterBudget);
    if (prop.type === 'string')
        return appendKeyValue(name, ': ', `'${prop.value}'`, characterBudget);
    return appendKeyValue(name, ': ', (_a = prop.value) !== null && _a !== void 0 ? _a : 'unknown', characterBudget);
}
function renderValue(object, budget, quote) {
    if (object.type === 'string') {
        const stringValue = object.value || (object.description ? object.description : '');
        const value = stringUtils.trimMiddle(stringValue, quote ? budget - 2 : budget);
        return quote ? `'${value}'` : value;
    }
    if (object.type === 'undefined') {
        return 'undefined';
    }
    if (object.subtype === 'null') {
        return 'null';
    }
    if (object.description) {
        return stringUtils.trimEnd(object.description, Math.max(budget, 100000));
    }
    return stringUtils.trimEnd(String('value' in object ? object.value : object.description), budget);
}
function formatFunctionDescription(description, characterBudget) {
    const builder = new budgetStringBuilder_1.BudgetStringBuilder(characterBudget);
    const text = description
        .replace(/^function [gs]et /, 'function ')
        .replace(/^function [gs]et\(/, 'function(')
        .replace(/^[gs]et /, '');
    // This set of best-effort regular expressions captures common function descriptions.
    // Ideally, some parser would provide prefix, arguments, function body text separately.
    const asyncMatch = text.match(/^(async\s+function)/);
    const isGenerator = text.startsWith('function*');
    const isGeneratorShorthand = text.startsWith('*');
    const isBasic = !isGenerator && text.startsWith('function');
    const isClass = text.startsWith('class ') || text.startsWith('class{');
    const firstArrowIndex = text.indexOf('=>');
    const isArrow = !asyncMatch && !isGenerator && !isBasic && !isClass && firstArrowIndex > 0;
    let textAfterPrefix;
    if (isClass) {
        textAfterPrefix = text.substring('class'.length);
        const classNameMatch = /^[^{\s]+/.exec(textAfterPrefix.trim());
        let className = '';
        if (classNameMatch)
            className = classNameMatch[0].trim() || '';
        addToken('class', textAfterPrefix, className);
    }
    else if (asyncMatch) {
        textAfterPrefix = text.substring(asyncMatch[1].length);
        addToken('async ƒ', textAfterPrefix, nameAndArguments(textAfterPrefix));
    }
    else if (isGenerator) {
        textAfterPrefix = text.substring('function*'.length);
        addToken('ƒ*', textAfterPrefix, nameAndArguments(textAfterPrefix));
    }
    else if (isGeneratorShorthand) {
        textAfterPrefix = text.substring('*'.length);
        addToken('ƒ*', textAfterPrefix, nameAndArguments(textAfterPrefix));
    }
    else if (isBasic) {
        textAfterPrefix = text.substring('function'.length);
        addToken('ƒ', textAfterPrefix, nameAndArguments(textAfterPrefix));
    }
    else if (isArrow) {
        let abbreviation = text;
        if (text.length > maxArrowFunctionCharacterLength)
            abbreviation = text.substring(0, firstArrowIndex + 2) + ' {\u2026}';
        addToken('', text, abbreviation);
    }
    else {
        addToken('ƒ', text, nameAndArguments(text));
    }
    return builder.build();
    function nameAndArguments(contents) {
        const startOfArgumentsIndex = contents.indexOf('(');
        const endOfArgumentsMatch = contents.match(/\)\s*{/);
        const endIndex = (endOfArgumentsMatch && endOfArgumentsMatch.index) || 0;
        if (startOfArgumentsIndex !== -1 && endOfArgumentsMatch && endIndex > startOfArgumentsIndex) {
            const name = contents.substring(0, startOfArgumentsIndex).trim() || '';
            const args = contents.substring(startOfArgumentsIndex, endIndex + 1);
            return name + args;
        }
        return '()';
    }
    function addToken(prefix, body, abbreviation) {
        if (!builder.checkBudget())
            return;
        if (prefix.length)
            builder.append(prefix + ' ');
        body = body.trim();
        if (body.endsWith(' { [native code] }'))
            body = body.substring(0, body.length - ' { [native code] }'.length);
        if (builder.budget() >= body.length)
            builder.append(body);
        else
            builder.append(abbreviation.replace(/\n/g, ' '));
    }
}
function previewException(rawException) {
    var _a, _b;
    const exception = rawException;
    if (exception.type !== 'object' || exception.subtype === 'null') {
        return { title: renderValue(exception, maxExceptionTitleLength, false) };
    }
    const description = (_b = (_a = exception.description) !== null && _a !== void 0 ? _a : exception.className) !== null && _b !== void 0 ? _b : 'Error';
    const firstCallFrame = /^\s+at\s/m.exec(description);
    if (!firstCallFrame) {
        const lastLineBreak = description.lastIndexOf('\n');
        if (lastLineBreak === -1)
            return { title: description };
        return { title: description.substring(0, lastLineBreak) };
    }
    return {
        title: description.substring(0, firstCallFrame.index - 1),
        stackTrace: description.substring(firstCallFrame.index + 2),
    };
}
exports.previewException = previewException;
function formatAsNumber(param, round, characterBudget) {
    if (param.type === 'number') {
        return String(param.value);
    }
    if (param.type === 'bigint') {
        return param.description;
    }
    const fallback = param;
    const value = typeof fallback.value === 'number' ? fallback.value : +String(fallback.description);
    return stringUtils.trimEnd(String(round ? Math.floor(value) : value), characterBudget);
}
function formatAsString(param, characterBudget) {
    return stringUtils.trimMiddle(String(typeof param.value !== 'undefined' ? param.value : param.description), characterBudget);
}
function formatAsTable(param) {
    var _a;
    // Collect columns, values and measure lengths.
    const rows = [];
    const colNames = new Set([undefined]);
    const colLengths = new Map();
    // Measure entries.
    for (const row of param.properties.filter(r => r.valuePreview)) {
        const value = new Map();
        value.set(undefined, row.name); // row index is a first column
        colLengths.set(undefined, Math.max(colLengths.get(undefined) || 0, row.name.length));
        rows.push(value);
        (_a = row.valuePreview) === null || _a === void 0 ? void 0 : _a.properties.map(prop => {
            if (!prop.value)
                return;
            colNames.add(prop.name);
            value.set(prop.name, prop.value);
            colLengths.set(prop.name, Math.max(colLengths.get(prop.name) || 0, prop.value.length));
        });
    }
    // Measure headers.
    for (const name of colNames.values()) {
        if (name)
            colLengths.set(name, Math.max(colLengths.get(name) || 0, name.length));
    }
    // Shrink columns if necessary.
    const columnsWidth = Array.from(colLengths.values()).reduce((a, c) => a + c, 0);
    const maxColumnsWidth = maxTableWidth - 4 - (colNames.size - 1) * 3;
    if (columnsWidth > maxColumnsWidth) {
        const ratio = maxColumnsWidth / columnsWidth;
        for (const name of colLengths.keys()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const newWidth = Math.max(minTableCellWidth, (colLengths.get(name) * ratio) | 0);
            colLengths.set(name, newWidth);
        }
    }
    // Template string for line separators.
    const colTemplates = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const name of colNames.values())
        colTemplates.push('-'.repeat(colLengths.get(name)));
    const rowTemplate = '[-' + colTemplates.join('-|-') + '-]';
    const table = [];
    table.push(rowTemplate.replace('[', '╭').replace(/\|/g, '┬').replace(']', '╮').replace(/-/g, '┄'));
    const header = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const name of colNames.values())
        header.push(pad(name || '', colLengths.get(name)));
    table.push('┊ ' + header.join(' ┊ ') + ' ┊');
    table.push(rowTemplate.replace('[', '├').replace(/\|/g, '┼').replace(']', '┤').replace(/-/g, '┄'));
    for (const value of rows) {
        const row = [];
        for (const colName of colNames.values()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            row.push(pad(value.get(colName) || '', colLengths.get(colName)));
        }
        table.push('┊ ' + row.join(' ┊ ') + ' ┊');
    }
    table.push(rowTemplate.replace('[', '╰').replace(/\|/g, '┴').replace(']', '╯').replace(/-/g, '┄'));
    return table.map(row => stringUtils.trimEnd(row, maxTableWidth)).join('\n');
}
exports.formatAsTable = formatAsTable;
exports.messageFormatters = new Map([
    ['', (param, context) => previewRemoteObjectInternal(param, context)],
    ['s', (param, context) => formatAsString(param, context.budget)],
    ['i', (param, context) => formatAsNumber(param, true, context.budget)],
    ['d', (param, context) => formatAsNumber(param, true, context.budget)],
    ['f', (param, context) => formatAsNumber(param, false, context.budget)],
    ['c', param => messageFormat.formatCssAsAnsi(param.value)],
    ['o', (param, context) => previewRemoteObjectInternal(param, context)],
    ['O', (param, context) => previewRemoteObjectInternal(param, context)],
]);
function pad(text, length) {
    if (text.length === length)
        return text;
    if (text.length < length)
        return text + ' '.repeat(length - text.length);
    return stringUtils.trimEnd(text, length);
}
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
