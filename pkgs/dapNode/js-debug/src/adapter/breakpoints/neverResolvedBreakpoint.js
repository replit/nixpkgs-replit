"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeverResolvedBreakpoint = void 0;
const userDefinedBreakpoint_1 = require("./userDefinedBreakpoint");
const hitCount_1 = require("./conditions/hitCount");
/**
 * A breakpoint that's never resolved or hit. This is used to place an invalid
 * condition or hit count breakpoint; DAP does not have a representation for
 * a single breakpoint failing to set, so on a failure we show an error as
 * standard out and place one of these virtual breakpoints.
 *
 * In CDP they do end up being 'real' breakpoints so the aren't the most
 * efficient construct, but they do the job without additional work or special
 * casing.
 */
class NeverResolvedBreakpoint extends userDefinedBreakpoint_1.UserDefinedBreakpoint {
    constructor(manager, dapId, source, dapParams) {
        super(manager, dapId, source, dapParams, new hitCount_1.HitCondition(() => false));
    }
    /**
     * @override
     */
    getResolvedUiLocation() {
        return undefined;
    }
}
exports.NeverResolvedBreakpoint = NeverResolvedBreakpoint;
//# sourceMappingURL=neverResolvedBreakpoint.js.map
//# sourceMappingURL=neverResolvedBreakpoint.js.map
