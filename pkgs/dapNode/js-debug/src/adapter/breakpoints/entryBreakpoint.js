"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryBreakpoint = void 0;
const path_1 = require("path");
const breakpointBase_1 = require("./breakpointBase");
/**
 * A breakpoint set automatically on module entry.
 */
class EntryBreakpoint extends breakpointBase_1.Breakpoint {
    constructor(manager, source, mode) {
        super(manager, source, { lineNumber: 1, columnNumber: 1 });
        this.mode = mode;
    }
    static getModeKeyForSource(mode, path) {
        return mode === 1 /* Greedy */ ? path_1.basename(path, path_1.extname(path) || undefined) : path;
    }
    _setPredicted() {
        return Promise.resolve();
    }
    _setByPath(thread, lineColumn) {
        if (!this.source.path) {
            return Promise.resolve();
        }
        const key = EntryBreakpoint.getModeKeyForSource(this.mode, this.source.path);
        return this.mode === 1 /* Greedy */
            ? super._setByUrl(thread, key, lineColumn)
            : super._setByPath(thread, lineColumn);
    }
}
exports.EntryBreakpoint = EntryBreakpoint;
//# sourceMappingURL=entryBreakpoint.js.map
//# sourceMappingURL=entryBreakpoint.js.map
