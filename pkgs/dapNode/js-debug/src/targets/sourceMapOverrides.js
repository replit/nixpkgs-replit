"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceMapOverrides = void 0;
const pathUtils_1 = require("../common/pathUtils");
const stringUtils_1 = require("../common/stringUtils");
// Patterns to match against various patterns:
const capturingGroup = '*';
const capturingGroupRe = new RegExp(stringUtils_1.escapeRegexSpecialChars(capturingGroup), 'g');
const nonCapturingGroup = '?:' + capturingGroup;
const nonCapturingGroupRe = new RegExp(stringUtils_1.escapeRegexSpecialChars(nonCapturingGroup), 'g');
const occurencesInString = (re, str) => {
    const matches = str.match(re);
    re.lastIndex = 0;
    return matches ? matches.length : 0;
};
const anyGroupRe = new RegExp(`${stringUtils_1.escapeRegexSpecialChars(nonCapturingGroup)}|${stringUtils_1.escapeRegexSpecialChars(capturingGroup)}`, 'g');
/**
 * Contains a collection of source map overrides, and can apply those to strings.
 */
class SourceMapOverrides {
    constructor(sourceMapOverrides, logger) {
        this.logger = logger;
        /**
         * Mapping of regexes to replacement patterns. The regexes should return
         * the value to replace in their first matching group, and the patterns
         * will have their asterisk '*', if any, replaced.
         */
        this.replacers = [];
        // Sort the overrides by length, large to small
        const sortedOverrideKeys = Object.keys(sourceMapOverrides).sort((a, b) => b.replace(nonCapturingGroup, '*').length - a.replace(nonCapturingGroup, '*').length);
        // Iterate the key/vals, only apply the first one that matches.
        for (const leftPatternRaw of sortedOverrideKeys) {
            let rightPattern = sourceMapOverrides[leftPatternRaw];
            if (!rightPattern.includes('*') && /\$[0-9'`&]/.test(rightPattern)) {
                this.replacers.push([new RegExp(`^${leftPatternRaw}$`, 'i'), rightPattern]);
                continue;
            }
            const leftPattern = pathUtils_1.forceForwardSlashes(leftPatternRaw);
            const entryStr = `"${leftPattern}": "${rightPattern}"`;
            const capturedGroups = occurencesInString(capturingGroupRe, leftPattern) -
                occurencesInString(nonCapturingGroupRe, leftPattern);
            if (capturedGroups > 1) {
                logger.warn("runtime.sourcemap" /* RuntimeSourceMap */, `Warning: only one asterisk allowed in a sourceMapPathOverrides entry - ${entryStr}`);
                continue;
            }
            if (occurencesInString(capturingGroupRe, rightPattern) > capturedGroups) {
                logger.warn("runtime.sourcemap" /* RuntimeSourceMap */, `The right side of a sourceMapPathOverrides entry must have 0 or 1 asterisks - ${entryStr}}`);
                continue;
            }
            let reSource = '^';
            let leftIndex = 0;
            anyGroupRe.lastIndex = 0;
            while (true) {
                const next = anyGroupRe.exec(leftPattern);
                reSource += stringUtils_1.escapeRegexSpecialChars(leftPattern.slice(leftIndex, next === null || next === void 0 ? void 0 : next.index), '/');
                if (!next) {
                    break;
                }
                if (next[0] === capturingGroup) {
                    reSource += '(.*?)';
                }
                else {
                    reSource += '.*?';
                }
                leftIndex = next.index + next[0].length;
            }
            if (capturedGroups === 0) {
                reSource += `([\\/\\\\].*)?`;
                rightPattern += '*';
            }
            this.replacers.push([
                new RegExp(reSource + '$', 'i'),
                rightPattern.replace(/\$/g, '$$$$').replace(/\*/, '$1'),
            ]);
        }
    }
    /**
     * Applies soruce map overrides to the path. The path should should given
     * as a filesystem path, not a URI.
     */
    apply(sourcePath) {
        const sourcePathWithForwardSlashes = pathUtils_1.forceForwardSlashes(sourcePath);
        for (const [re, replacement] of this.replacers) {
            const mappedPath = sourcePathWithForwardSlashes.replace(re, replacement);
            if (mappedPath !== sourcePathWithForwardSlashes) {
                this.logger.verbose("runtime.sourcemap" /* RuntimeSourceMap */, `SourceMap: mapping ${sourcePath} => ${mappedPath}, via sourceMapPathOverrides entry - ${re.toString()}`);
                return pathUtils_1.properJoin(mappedPath); // normalization, see #401
            }
        }
        return sourcePath;
    }
}
exports.SourceMapOverrides = SourceMapOverrides;
//# sourceMappingURL=sourceMapOverrides.js.map
//# sourceMappingURL=sourceMapOverrides.js.map
