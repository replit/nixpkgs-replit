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
exports.UserDefinedBreakpoint = void 0;
const nls = __importStar(require("vscode-nls"));
const promiseUtil_1 = require("../../common/promiseUtil");
const breakpointBase_1 = require("./breakpointBase");
const localize = nls.loadMessageBundle();
class UserDefinedBreakpoint extends breakpointBase_1.Breakpoint {
    /**
     * @param hitCondition - Hit condition for this breakpoint. See
     * {@link HitCondition} for more information.
     * @throws ProtocolError - if an invalid logpoint message is given
     */
    constructor(manager, dapId, source, dapParams, condition) {
        super(manager, source, { lineNumber: dapParams.line, columnNumber: dapParams.column || 1 });
        this.dapId = dapId;
        this.dapParams = dapParams;
        this.condition = condition;
        /**
         * A deferred that resolves once the breakpoint 'set' response has been
         * returned to the UI. We should wait for this to finish before sending any
         * notifications about breakpoint changes.
         */
        this.completedSet = promiseUtil_1.getDeferred();
    }
    /**
     * Returns whether this breakpoint is equivalent on DAP to the other one.
     */
    equivalentTo(other) {
        return (other.dapParams.column === this.dapParams.column &&
            other.dapParams.line === this.dapParams.line &&
            other.dapParams.hitCondition === this.dapParams.hitCondition &&
            other.dapParams.condition === this.dapParams.condition &&
            other.dapParams.logMessage === this.dapParams.logMessage);
    }
    /**
     * Returns a promise that resolves once the breakpoint 'set' response
     */
    untilSetCompleted() {
        return this.completedSet.promise;
    }
    /**
     * Marks the breakpoint 'set' as having finished.
     */
    markSetCompleted() {
        this.completedSet.resolve();
    }
    /**
     * Returns whether the debugger should remain paused on this breakpoint
     * according to the hit condition.
     */
    testHitCondition(event) {
        return this.condition.shouldStayPaused(event);
    }
    /**
     * Returns a DAP representation of the breakpoint. If the breakpoint is
     * resolved, this will be fulfilled with the complete source location.
     */
    async toDap() {
        const location = this.enabled && this.getResolvedUiLocation();
        if (location) {
            return {
                id: this.dapId,
                verified: true,
                source: await location.source.toDap(),
                line: location.lineNumber,
                column: location.columnNumber,
            };
        }
        return {
            id: this.dapId,
            verified: false,
            message: localize('breakpoint.provisionalBreakpoint', `Unbound breakpoint`),
        };
    }
    /**
     * Returns information for the diagnostic dump.
     */
    diagnosticDump() {
        return {
            source: this.source,
            params: this.dapParams,
            cdp: this.cdpBreakpoints,
        };
    }
    /**
     * @override
     */
    getBreakCondition() {
        return this.condition.breakCondition;
    }
    /**
     * @override
     */
    updateCdpRefs(mutator) {
        const previousLocation = this.getResolvedUiLocation();
        super.updateCdpRefs(mutator);
        if (this.getResolvedUiLocation() !== previousLocation) {
            this.notifyResolved();
        }
    }
    /**
     * Gets the location whether this breakpoint is resolved, if any.
     */
    getResolvedUiLocation() {
        for (const bp of this.cdpBreakpoints) {
            if (bp.state === 1 /* Applied */ && bp.uiLocations.length) {
                return bp.uiLocations[0];
            }
        }
        return undefined;
    }
    /**
     * Called the breakpoint manager to notify that the breakpoint is resolved,
     * used for statistics and notifying the UI.
     */
    async notifyResolved() {
        await this._manager.notifyBreakpointChange(this, this.completedSet.hasSettled());
    }
}
exports.UserDefinedBreakpoint = UserDefinedBreakpoint;
//# sourceMappingURL=userDefinedBreakpoint.js.map
//# sourceMappingURL=userDefinedBreakpoint.js.map
