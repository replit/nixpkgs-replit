"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeForClipboard = exports.serializeForClipboardTmpl = void 0;
const _1 = require(".");
/**
 * Safe-stringifies the value as JSON, replacing
 */
exports.serializeForClipboardTmpl = _1.templateFunction(function (valueToStringify, spaces) {
    const indent = ' '.repeat(spaces);
    const eol = '\n';
    function serializeToJavaScriptyString(value, level = 0, seen = []) {
        switch (typeof value) {
            case 'bigint':
                return `${value}n`;
            case 'boolean':
                return value.toString();
            case 'function': {
                const lines = value
                    .toString()
                    .replace(/^[^\s]+\(/, 'function(')
                    .split(/\r?\n/g);
                let trimSpaceRe = /^$/;
                for (const line of lines) {
                    const match = /^[ \t]+/.exec(line);
                    if (match) {
                        trimSpaceRe = new RegExp(`^[ \\t]{0,${match[0].length}}`);
                        break;
                    }
                }
                return lines
                    .map((line, i) => {
                    if (i === 0) {
                        return line;
                    }
                    line = line.replace(trimSpaceRe, '');
                    if (i === lines.length - 1) {
                        return indent.repeat(level) + line;
                    }
                    return indent.repeat(level + 1) + line;
                })
                    .join(eol);
            }
            case 'number':
                return `${value}`;
            case 'object':
                if (value === null) {
                    return 'null';
                }
                if (seen.includes(value)) {
                    return '[Circular]';
                }
                if (typeof Node !== 'undefined' && valueToStringify instanceof Node) {
                    return valueToStringify.outerHTML;
                }
                if (value instanceof Array) {
                    return [
                        `[`,
                        ...value.map(item => indent.repeat(level + 1) +
                            serializeToJavaScriptyString(item, level + 1, [...seen, value]) +
                            ','),
                        indent.repeat(level) + ']',
                    ].join(eol);
                }
                const asPropMap = value;
                return [
                    `{`,
                    ...Object.keys(asPropMap).map(key => indent.repeat(level + 1) +
                        (/^[$a-z_][0-9a-z_$]*$/i.test(key) ? key : JSON.stringify(key)) +
                        ': ' +
                        serializeToJavaScriptyString(asPropMap[key], level + 1, [...seen, value]) +
                        ','),
                    indent.repeat(level) + '}',
                ].join(eol);
            case 'string':
                return JSON.stringify(value);
            case 'symbol':
                return value.toString();
            case 'undefined':
                return 'undefined';
            default:
                return String(value);
        }
    }
    try {
        return serializeToJavaScriptyString(valueToStringify);
    }
    catch (_a) {
        return '' + valueToStringify;
    }
});
exports.serializeForClipboard = _1.remoteFunction(`
  function(spaces2) {
    const result = ${exports.serializeForClipboardTmpl('this', 'spaces2')};
    return result;
  }
`);
//# sourceMappingURL=serializeForClipboard.js.map
//# sourceMappingURL=serializeForClipboard.js.map
