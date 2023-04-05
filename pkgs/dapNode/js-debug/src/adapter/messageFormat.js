"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCssAsAnsi = exports.formatMessage = void 0;
const color_1 = __importDefault(require("color"));
const budgetStringBuilder_1 = require("../common/budgetStringBuilder");
const maxMessageFormatLength = 10000;
function tokenizeFormatString(format, formatterNames) {
    if (!format.includes('%')) {
        return [{ type: 'string', value: format }]; // happy path, no formatting needed
    }
    const tokens = [];
    function addStringToken(str) {
        if (!str)
            return;
        const lastToken = tokens[tokens.length - 1];
        if ((lastToken === null || lastToken === void 0 ? void 0 : lastToken.type) === 'string')
            lastToken.value += str;
        else
            tokens.push({ type: 'string', value: str });
    }
    function addSpecifierToken(specifier, precision, substitutionIndex) {
        tokens.push({
            type: 'specifier',
            specifier: specifier,
            precision: precision,
            substitutionIndex,
        });
    }
    let textStart = 0;
    let substitutionIndex = 0;
    const re = new RegExp(`%%|%(?:(\\d+)\\$)?(?:\\.(\\d*))?([${formatterNames.join('')}])`, 'g');
    for (let match = re.exec(format); !!match; match = re.exec(format)) {
        const matchStart = match.index;
        if (matchStart > textStart)
            addStringToken(format.substring(textStart, matchStart));
        if (match[0] === '%%') {
            addStringToken('%');
        }
        else {
            const [, substitionString, precisionString, specifierString] = match;
            if (substitionString && Number(substitionString) > 0)
                substitutionIndex = Number(substitionString) - 1;
            const precision = precisionString ? Number(precisionString) : undefined;
            addSpecifierToken(specifierString, precision, substitutionIndex);
            ++substitutionIndex;
        }
        textStart = matchStart + match[0].length;
    }
    addStringToken(format.substring(textStart));
    return tokens;
}
function formatMessage(format, substitutions, formatters) {
    const tokens = tokenizeFormatString(format, Array.from(formatters.keys()));
    const usedSubstitutionIndexes = new Set();
    const defaultFormatter = formatters.get('');
    if (!defaultFormatter) {
        throw new Error('Expected to hav a default formatter');
    }
    const builder = new budgetStringBuilder_1.BudgetStringBuilder(maxMessageFormatLength);
    let cssFormatApplied = false;
    for (let i = 0; builder.checkBudget() && i < tokens.length; ++i) {
        const token = tokens[i];
        if (token.type === 'string') {
            builder.append(token.value);
            continue;
        }
        const index = token.substitutionIndex;
        if (index >= substitutions.length) {
            // If there are not enough substitutions for the current substitutionIndex
            // just output the format specifier literally and move on.
            builder.append('%' + (token.precision || '') + token.specifier);
            continue;
        }
        usedSubstitutionIndexes.add(index);
        if (token.specifier === 'c')
            cssFormatApplied = true;
        const formatter = formatters.get(token.specifier) || defaultFormatter;
        builder.append(formatter(substitutions[index], { budget: builder.budget(), quoted: false }));
    }
    if (cssFormatApplied)
        builder.append('\x1b[0m'); // clear format
    for (let i = 0; builder.checkBudget() && i < substitutions.length; ++i) {
        if (usedSubstitutionIndexes.has(i))
            continue;
        usedSubstitutionIndexes.add(i);
        if (format || i)
            // either we are second argument or we had format.
            builder.append(' ');
        builder.append(defaultFormatter(substitutions[i], { budget: builder.budget(), quoted: false }));
    }
    return {
        result: builder.build(),
        usedAllSubs: usedSubstitutionIndexes.size === substitutions.length,
    };
}
exports.formatMessage = formatMessage;
function escapeAnsiColor(colorString) {
    try {
        // Color can parse hex and color names
        const color = new color_1.default(colorString);
        return color.ansi256().object().ansi256;
    }
    catch (ex) {
        // Unable to parse Color
        // For instance, "inherit" color will throw
    }
    return undefined;
}
function formatCssAsAnsi(style) {
    const cssRegex = /\s*(.*?)\s*:\s*(.*?)\s*(?:;|$)/g;
    let escapedSequence = '\x1b[0m';
    let match = cssRegex.exec(style);
    while (match !== null) {
        if (match.length === 3) {
            switch (match[1]) {
                case 'color':
                    const color = escapeAnsiColor(match[2]);
                    if (color)
                        escapedSequence += `\x1b[38;5;${color}m`;
                    break;
                case 'background':
                case 'background-color':
                    const background = escapeAnsiColor(match[2]);
                    if (background)
                        escapedSequence += `\x1b[48;5;${background}m`;
                    break;
                case 'font-weight':
                    if (match[2] === 'bold')
                        escapedSequence += '\x1b[1m';
                    break;
                case 'font-style':
                    if (match[2] === 'italic')
                        escapedSequence += '\x1b[3m';
                    break;
                case 'text-decoration':
                    if (match[2] === 'underline')
                        escapedSequence += '\x1b[4m';
                    break;
                default:
                // css not mapped, skip
            }
        }
        match = cssRegex.exec(style);
    }
    return escapedSequence;
}
exports.formatCssAsAnsi = formatCssAsAnsi;
//# sourceMappingURL=messageFormat.js.map
//# sourceMappingURL=messageFormat.js.map
