"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternEntryBreakpoint = void 0;
const micromatch_1 = require("micromatch");
const pathUtils_1 = require("../../common/pathUtils");
const entryBreakpoint_1 = require("./entryBreakpoint");
/**
 * A breakpoint set from the `runtimeSourcemapPausePatterns`. Unlike a normal
 * entrypoint breakpoint, it's always applied from the "path" as its pattern.
 */
class PatternEntryBreakpoint extends entryBreakpoint_1.EntryBreakpoint {
    constructor(manager, pattern) {
        super(manager, { path: pattern }, 1 /* Greedy */);
        this.pattern = pattern;
    }
    /**
     * @override
     */
    async enable(thread) {
        if (this.isEnabled) {
            return;
        }
        this.isEnabled = true;
        const re = micromatch_1.makeRe(pathUtils_1.forceForwardSlashes(this.pattern), { contains: true, lookbehinds: false });
        await this._setAny(thread, {
            // fix case sensitivity on drive letter:
            urlRegex: re.source.replace(/([a-z]):/i, (m, drive) => `[${drive.toLowerCase()}${drive.toUpperCase()}]:`),
            lineNumber: 0,
            columnNumber: 0,
        });
    }
}
exports.PatternEntryBreakpoint = PatternEntryBreakpoint;
//# sourceMappingURL=patternEntrypointBreakpoint.js.map
//# sourceMappingURL=patternEntrypointBreakpoint.js.map
