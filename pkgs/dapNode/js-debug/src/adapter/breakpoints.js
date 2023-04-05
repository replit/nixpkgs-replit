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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakpointManager = void 0;
const inversify_1 = require("inversify");
const logging_1 = require("../common/logging");
const objUtils_1 = require("../common/objUtils");
const promiseUtil_1 = require("../common/promiseUtil");
const urlUtils = __importStar(require("../common/urlUtils"));
const configuration_1 = require("../configuration");
const connection_1 = require("../dap/connection");
const protocolError_1 = require("../dap/protocolError");
const breakpointsStatistics_1 = require("../statistics/breakpointsStatistics");
const performance_1 = require("../telemetry/performance");
const breakpointPredictor_1 = require("./breakpointPredictor");
const conditions_1 = require("./breakpoints/conditions");
const entryBreakpoint_1 = require("./breakpoints/entryBreakpoint");
const neverResolvedBreakpoint_1 = require("./breakpoints/neverResolvedBreakpoint");
const patternEntrypointBreakpoint_1 = require("./breakpoints/patternEntrypointBreakpoint");
const userDefinedBreakpoint_1 = require("./breakpoints/userDefinedBreakpoint");
const diagnosticToolSuggester_1 = require("./diagnosticToolSuggester");
const sources_1 = require("./sources");
const isSetAtEntry = (bp) => bp.originalPosition.columnNumber === 1 && bp.originalPosition.lineNumber === 1;
const breakpointSetTimeout = 500;
const DontCompare = Symbol('DontCompare');
let BreakpointManager = class BreakpointManager {
    constructor(dap, sourceContainer, logger, launchConfig, conditionFactory, suggester, _breakpointsPredictor) {
        this.logger = logger;
        this.launchConfig = launchConfig;
        this.conditionFactory = conditionFactory;
        this.suggester = suggester;
        this._breakpointsPredictor = _breakpointsPredictor;
        this._resolvedBreakpoints = new Map();
        this._totalBreakpointsCount = 0;
        this._launchBlocker = new Set();
        this._predictorDisabledForTest = false;
        this._breakpointsStatisticsCalculator = new breakpointsStatistics_1.BreakpointsStatisticsCalculator();
        this.entryBreakpointMode = 0 /* Exact */;
        /**
         * A filter function that enables/disables breakpoints.
         */
        this._enabledFilter = () => true;
        /**
         * User-defined breakpoints by path on disk.
         */
        this._byPath = urlUtils.caseNormalizedMap();
        this._sourceMapHandlerWasUpdated = false;
        /**
         * User-defined breakpoints by `sourceReference`.
         */
        this._byRef = new Map();
        /**
         * Mapping of source paths to entrypoint breakpoint IDs we set there.
         */
        this.moduleEntryBreakpoints = urlUtils.caseNormalizedMap();
        this._dap = dap;
        this._sourceContainer = sourceContainer;
        _breakpointsPredictor === null || _breakpointsPredictor === void 0 ? void 0 : _breakpointsPredictor.onLongParse(() => dap.longPrediction({}));
        this._scriptSourceMapHandler = async (script, sources) => {
            if (!logger.assert(this._thread, 'Expected thread to be set for the breakpoint source map handler')) {
                return [];
            }
            const todo = [];
            // New script arrived, pointing to |sources| through a source map.
            // We search for all breakpoints in |sources| and set them to this
            // particular script.
            for (const source of sources) {
                const path = source.absolutePath;
                const byPath = path ? this._byPath.get(path) : undefined;
                for (const breakpoint of byPath || [])
                    todo.push(breakpoint.updateForSourceMap(this._thread, script));
                const byRef = this._byRef.get(source.sourceReference);
                for (const breakpoint of byRef || [])
                    todo.push(breakpoint.updateForSourceMap(this._thread, script));
            }
            return (await Promise.all(todo)).reduce((a, b) => [...a, ...b], []);
        };
    }
    /**
     * Gets a flat list of all registered breakpoints.
     */
    get allUserBreakpoints() {
        return objUtils_1.flatten([...this._byPath.values(), ...this._byRef.values()]);
    }
    /**
     * Returns user-defined breakpoints set by ref.
     */
    get appliedByPath() {
        return this._byPath;
    }
    /**
     * Returns user-defined breakpoints set by ref.
     */
    get appliedByRef() {
        return this._byRef;
    }
    /**
     * Returns whether a breakpoint is set at the given UI location.
     */
    hasAtLocation(location) {
        const breakpointsAtPath = this._byPath.get(location.source.absolutePath) || [];
        const breakpointsAtSource = this._byRef.get(location.source.sourceReference) || [];
        return breakpointsAtPath
            .concat(breakpointsAtSource)
            .some(bp => bp.originalPosition.columnNumber === location.columnNumber &&
            bp.originalPosition.lineNumber === location.lineNumber);
    }
    /**
     * Moves all breakpoints set in the `fromSource` to their corresponding
     * location in the `toSource`, using the provided source map. Breakpoints
     * are don't have a corresponding location won't be moved.
     */
    moveBreakpoints(fromSource, sourceMap, toSource) {
        const tryUpdateLocations = (breakpoints) => objUtils_1.bisectArray(breakpoints, bp => {
            const gen = this._sourceContainer.getOptiminalOriginalPosition(sourceMap, bp.originalPosition);
            if (gen.column === null || gen.line === null) {
                return false;
            }
            bp.updateSourceLocation({
                path: toSource.absolutePath,
                sourceReference: toSource.sourceReference,
            }, { lineNumber: gen.line, columnNumber: gen.column + 1, source: toSource });
            return false;
        });
        const fromPath = fromSource.absolutePath;
        const toPath = toSource.absolutePath;
        const byPath = fromPath ? this._byPath.get(fromPath) : undefined;
        if (byPath && toPath) {
            const [remaining, moved] = tryUpdateLocations(byPath);
            this._byPath.set(fromPath, remaining);
            this._byPath.set(toPath, moved);
        }
        const byRef = this._byRef.get(fromSource.sourceReference);
        if (byRef) {
            const [remaining, moved] = tryUpdateLocations(byRef);
            this._byRef.set(fromSource.sourceReference, remaining);
            this._byRef.set(toSource.sourceReference, moved);
        }
    }
    /**
     * Update the entry breakpoint mode. Returns a promise that resolves
     * once all breakpoints are adjusted.
     * @see Thread._handleWebpackModuleEval for usage information.
     */
    async updateEntryBreakpointMode(thread, mode) {
        if (mode === this.entryBreakpointMode) {
            return;
        }
        const previous = [...this.moduleEntryBreakpoints.values()];
        this.moduleEntryBreakpoints.clear();
        this.entryBreakpointMode = mode;
        await Promise.all(previous.map(p => this.ensureModuleEntryBreakpoint(thread, p.source)));
    }
    /**
     * Adds and applies a filter to enable/disable breakpoints based on
     * the predicate function. If a "compare" is provided, the filter will
     * only be updated if the current filter matches the given one.
     */
    async applyEnabledFilter(filter, compare = DontCompare) {
        if (compare !== DontCompare && this._enabledFilter !== compare) {
            return;
        }
        this._enabledFilter = filter || (() => true);
        const thread = this._thread;
        if (!thread) {
            return;
        }
        await Promise.all(this.allUserBreakpoints.map(bp => this._enabledFilter(bp) ? bp.enable(thread) : bp.disable()));
    }
    /**
     * Returns possible breakpoint locations for the given range.
     */
    async getBreakpointLocations(thread, request) {
        // Find the source we're querying in, then resolve all possibly sourcemapped
        // locations for that script.
        const source = this._sourceContainer.source(request.source);
        if (!source) {
            return [];
        }
        const startLocations = this._sourceContainer.currentSiblingUiLocations({
            source,
            lineNumber: request.line,
            columnNumber: request.column === undefined ? 1 : request.column,
        });
        const endLocations = this._sourceContainer.currentSiblingUiLocations({
            source,
            lineNumber: request.endLine === undefined ? request.line + 1 : request.endLine,
            columnNumber: request.endColumn === undefined ? 1 : request.endColumn,
        });
        // As far as I know the number of start and end locations should be the
        // same, log if this is not the case.
        if (startLocations.length !== endLocations.length) {
            this.logger.warn("internal" /* Internal */, 'Expected to have the same number of start and end locations');
            return [];
        }
        // For each viable location, attempt to identify its script ID and then ask
        // Chrome for the breakpoints in the given range. For almost all scripts
        // we'll only every find one viable location with a script.
        const todo = [];
        for (let i = 0; i < startLocations.length; i++) {
            const start = startLocations[i];
            const end = endLocations[i];
            if (start.source !== end.source) {
                this.logger.warn("internal" /* Internal */, 'Expected to have the same number of start and end scripts');
                continue;
            }
            // Only take the first script that matches this source. The breakpoints
            // are all coming from the same source code, so possible breakpoints
            // at one location where this source is present should match every other.
            const lsrc = start.source;
            const scripts = thread.scriptsFromSource(lsrc);
            if (scripts.size === 0) {
                continue;
            }
            const { scriptId } = scripts.values().next().value;
            todo.push(thread
                .cdp()
                .Debugger.getPossibleBreakpoints({
                restrictToFunction: false,
                start: Object.assign({ scriptId }, sources_1.uiToRawOffset(sources_1.base1To0(start), lsrc.runtimeScriptOffset)),
                end: Object.assign({ scriptId }, sources_1.uiToRawOffset(sources_1.base1To0(end), lsrc.runtimeScriptOffset)),
            })
                .then(r => {
                if (!r) {
                    return [];
                }
                // Map the locations from CDP back to their original source positions.
                // Discard any that map outside of the source we're interested in,
                // which is possible (e.g. if a section of code from one source is
                // inlined amongst the range we request).
                const result = [];
                for (const location of r.locations) {
                    const { lineNumber, columnNumber = 0 } = location;
                    const sourceLocations = this._sourceContainer.currentSiblingUiLocations(Object.assign({ source: lsrc }, sources_1.rawToUiOffset(sources_1.base0To1({ lineNumber, columnNumber }), lsrc.runtimeScriptOffset)), source);
                    for (const srcLocation of sourceLocations) {
                        result.push({ line: srcLocation.lineNumber, column: srcLocation.columnNumber });
                    }
                }
                return result;
            }));
        }
        // Gather our results and flatten the array.
        return (await Promise.all(todo)).reduce((acc, r) => [...acc, ...r], []);
    }
    /**
     * Updates the thread the breakpoint manager is attached to.
     */
    setThread(thread) {
        var _a;
        this._thread = thread;
        this._thread.cdp().Debugger.on('breakpointResolved', event => {
            const breakpoint = this._resolvedBreakpoints.get(event.breakpointId);
            if (breakpoint) {
                breakpoint.updateUiLocations(thread, event.breakpointId, [event.location]);
            }
        });
        this._thread.setSourceMapDisabler(breakpointIds => {
            const sources = [];
            for (const id of breakpointIds) {
                const breakpoint = this._resolvedBreakpoints.get(id);
                if (breakpoint) {
                    const source = this._sourceContainer.source(breakpoint.source);
                    if (sources_1.isSourceWithMap(source))
                        sources.push(source);
                }
            }
            return sources;
        });
        for (const breakpoints of this._byPath.values()) {
            breakpoints.forEach(b => this._setBreakpoint(b, thread));
            this.ensureModuleEntryBreakpoint(thread, (_a = breakpoints[0]) === null || _a === void 0 ? void 0 : _a.source);
        }
        for (const breakpoints of this._byRef.values()) {
            breakpoints.forEach(b => this._setBreakpoint(b, thread));
        }
        if ('runtimeSourcemapPausePatterns' in this.launchConfig &&
            this.launchConfig.runtimeSourcemapPausePatterns.length) {
            this.setRuntimeSourcemapPausePatterns(thread, this.launchConfig.runtimeSourcemapPausePatterns); // will update the launchblocker
        }
        if (this._byPath.size > 0 || this._byRef.size > 0) {
            this._updateSourceMapHandler(this._thread);
        }
    }
    /**
     * Returns a promise that resolves when all breakpoints that can be set,
     * have been set. The debugger waits on this to avoid running too early
     * and missing breakpoints.
     */
    async launchBlocker() {
        performance_1.logPerf(this.logger, 'BreakpointManager.launchBlocker', async () => {
            if (!this._predictorDisabledForTest) {
                await Promise.all([...this._launchBlocker]);
            }
        });
    }
    setRuntimeSourcemapPausePatterns(thread, patterns) {
        return Promise.all(patterns.map(pattern => this._setBreakpoint(new patternEntrypointBreakpoint_1.PatternEntryBreakpoint(this, pattern), thread)));
    }
    addLaunchBlocker(...promises) {
        for (const promise of promises) {
            this._launchBlocker.add(promise);
            promise.finally(() => this._launchBlocker.delete(promise));
        }
    }
    setSourceMapPauseDisabledForTest() {
        // this._sourceMapPauseDisabledForTest = disabled;
    }
    setPredictorDisabledForTest(disabled) {
        this._predictorDisabledForTest = disabled;
    }
    async _updateSourceMapHandler(thread) {
        this._sourceMapHandlerWasUpdated = true;
        const perScriptSm = this.launchConfig.perScriptSourcemaps === 'yes';
        if (perScriptSm) {
            await Promise.all([
                this.updateEntryBreakpointMode(thread, 1 /* Greedy */),
                thread.setScriptSourceMapHandler(false, this._scriptSourceMapHandler),
            ]);
        }
        else if (this._breakpointsPredictor && !this.launchConfig.pauseForSourceMap) {
            await thread.setScriptSourceMapHandler(false, this._scriptSourceMapHandler);
        }
        else {
            await thread.setScriptSourceMapHandler(true, this._scriptSourceMapHandler);
        }
    }
    _setBreakpoint(b, thread) {
        if (!this._enabledFilter(b)) {
            return;
        }
        this.addLaunchBlocker(Promise.race([promiseUtil_1.delay(breakpointSetTimeout), b.enable(thread)]));
    }
    async setBreakpoints(params, ids) {
        var _a;
        if (!this._sourceMapHandlerWasUpdated && this._thread) {
            await this._updateSourceMapHandler(this._thread);
        }
        params.source.path = urlUtils.platformPathToPreferredCase(params.source.path);
        // If we see we want to set breakpoints in file by source reference ID but
        // it doesn't exist, they were probably from a previous section. The
        // references for scripts just auto-increment per session and are entirely
        // ephemeral. Remove the reference so that we fall back to a path if possible.
        if (params.source.sourceReference /* not (undefined or 0=on disk) */ &&
            params.source.path &&
            !this._sourceContainer.source(params.source)) {
            params.source.sourceReference = undefined;
        }
        // Wait until the breakpoint predictor finishes to be sure that we
        // can place correctly in breakpoint.set().
        if (!this._predictorDisabledForTest && this._breakpointsPredictor) {
            const promise = this._breakpointsPredictor.predictBreakpoints(params);
            this.addLaunchBlocker(promise);
            await promise;
        }
        // Creates new breakpoints for the parameters, unsetting any previous
        // breakpoints that don't still exist in the params.
        const mergeInto = (previous) => {
            var _a;
            const result = { unbound: previous.slice(), new: [], list: [] };
            if (!params.breakpoints) {
                return result;
            }
            for (let index = 0; index < params.breakpoints.length; index++) {
                const bpParams = params.breakpoints[index];
                let created;
                try {
                    created = new userDefinedBreakpoint_1.UserDefinedBreakpoint(this, ids[index], params.source, bpParams, this.conditionFactory.getConditionFor(bpParams));
                }
                catch (e) {
                    if (!(e instanceof protocolError_1.ProtocolError)) {
                        throw e;
                    }
                    this._dap.output({ category: 'stderr', output: e.message });
                    created = new neverResolvedBreakpoint_1.NeverResolvedBreakpoint(this, ids[index], params.source, bpParams);
                }
                const existingIndex = result.unbound.findIndex(p => p.equivalentTo(created));
                const existing = result.unbound[existingIndex];
                if ((_a = existing === null || existing === void 0 ? void 0 : existing.equivalentTo) === null || _a === void 0 ? void 0 : _a.call(existing, created)) {
                    result.list.push(existing);
                    result.unbound.splice(existingIndex, 1);
                }
                else {
                    result.new.push(created);
                    result.list.push(created);
                }
            }
            return result;
        };
        const getCurrent = () => params.source.path
            ? this._byPath.get(params.source.path)
            : params.source.sourceReference
                ? this._byRef.get(params.source.sourceReference)
                : undefined;
        const result = mergeInto((_a = getCurrent()) !== null && _a !== void 0 ? _a : []);
        if (params.source.path) {
            this._byPath.set(params.source.path, result.list);
        }
        else if (params.source.sourceReference) {
            this._byRef.set(params.source.sourceReference, result.list);
        }
        else {
            return { breakpoints: [] };
        }
        // Cleanup existing breakpoints before setting new ones.
        this._totalBreakpointsCount -= result.unbound.length;
        await Promise.all(result.unbound.map(b => b.disable()));
        this._totalBreakpointsCount += result.new.length;
        const thread = this._thread;
        if (thread && result.new.length) {
            // This will add itself to the launch blocker if needed:
            this.ensureModuleEntryBreakpoint(thread, params.source);
            // double-checking the current list fixes:
            // https://github.com/microsoft/vscode-js-debug/issues/679
            const currentList = getCurrent();
            const promise = Promise.all(result.new
                .filter(this._enabledFilter)
                .filter(bp => currentList === null || currentList === void 0 ? void 0 : currentList.includes(bp))
                .map(b => b.enable(thread)));
            this.addLaunchBlocker(Promise.race([promiseUtil_1.delay(breakpointSetTimeout), promise]));
            await promise;
        }
        const dapBreakpoints = await Promise.all(result.list.map(b => b.toDap()));
        this._breakpointsStatisticsCalculator.registerBreakpoints(dapBreakpoints);
        // In the next task after we send the response to the adapter, mark the
        // breakpoints as having been set.
        promiseUtil_1.delay(0).then(() => result.new.forEach(bp => bp.markSetCompleted()));
        return { breakpoints: dapBreakpoints };
    }
    /**
     * Emits a message on DAP notifying of a state update in this breakpoint.
     */
    async notifyBreakpointChange(breakpoint, emitChange) {
        const dap = await breakpoint.toDap();
        if (dap.verified) {
            this._breakpointsStatisticsCalculator.registerResolvedBreakpoint(breakpoint.dapId);
            this.suggester.notifyVerifiedBreakpoint();
        }
        if (emitChange) {
            this._dap.breakpoint({
                reason: 'changed',
                breakpoint: dap,
            });
        }
    }
    /**
     * Rreturns whether any of the given breakpoints are an entrypoint breakpoint.
     */
    isEntrypointBreak(hitBreakpointIds, scriptId) {
        // Fix: if we stopped in a script where an active entrypoint breakpoint
        // exists, regardless of the reason, treat this as a breakpoint.
        // ref: https://github.com/microsoft/vscode/issues/107859
        const entryInScript = [...this.moduleEntryBreakpoints.values()].filter(bp => bp.enabled && bp.cdpScriptIds.has(scriptId));
        if (entryInScript.length) {
            for (const breakpoint of entryInScript) {
                if (!(breakpoint instanceof patternEntrypointBreakpoint_1.PatternEntryBreakpoint)) {
                    breakpoint.disable();
                }
            }
            return true;
        }
        return hitBreakpointIds.some(id => {
            const bp = this._resolvedBreakpoints.get(id);
            return bp && (bp instanceof entryBreakpoint_1.EntryBreakpoint || isSetAtEntry(bp));
        });
    }
    /**
     * Handler that should be called *after* source map resolution on an entry
     * breakpoint. Returns whether the debugger should remain paused.
     */
    async shouldPauseAt(pausedEvent, hitBreakpointIds, delegateEntryBreak, continueByDefault = false) {
        if (!hitBreakpointIds.length) {
            return pausedEvent.reason !== 'instrumentation';
        }
        // To automatically continue, we need *no* breakpoints to want to pause and
        // at least one breakpoint who wants to continue. See
        // {@link HitCondition} for more details here.
        let votesForPause = 0;
        let votesForContinue = continueByDefault ? 1 : 0;
        await Promise.all(hitBreakpointIds.map(async (breakpointId) => {
            if ((delegateEntryBreak === null || delegateEntryBreak === void 0 ? void 0 : delegateEntryBreak.cdpId) === breakpointId) {
                votesForPause++;
                return;
            }
            const breakpoint = this._resolvedBreakpoints.get(breakpointId);
            if (breakpoint instanceof entryBreakpoint_1.EntryBreakpoint) {
                // we intentionally don't remove the record from the map; it's kept as
                // an indicator that it did exist and was hit, so that if further
                // breakpoints are set in the file it doesn't get re-applied.
                if (this.entryBreakpointMode === 0 /* Exact */ &&
                    !(breakpoint instanceof patternEntrypointBreakpoint_1.PatternEntryBreakpoint)) {
                    breakpoint.disable();
                }
                votesForContinue++;
                return;
            }
            if (!(breakpoint instanceof userDefinedBreakpoint_1.UserDefinedBreakpoint)) {
                return;
            }
            if (await breakpoint.testHitCondition(pausedEvent)) {
                votesForPause++;
            }
            else {
                votesForContinue++;
            }
        }));
        return votesForPause > 0 || votesForContinue === 0;
    }
    /**
     * Registers that the given breakpoints were hit for statistics.
     */
    registerBreakpointsHit(hitBreakpointIds) {
        for (const breakpointId of hitBreakpointIds) {
            const breakpoint = this._resolvedBreakpoints.get(breakpointId);
            if (breakpoint instanceof userDefinedBreakpoint_1.UserDefinedBreakpoint) {
                this._breakpointsStatisticsCalculator.registerBreakpointHit(breakpoint.dapId);
            }
        }
    }
    statisticsForTelemetry() {
        return this._breakpointsStatisticsCalculator.statistics();
    }
    /**
     * Ensures an entry breakpoint is present for the given source, creating
     * one if there's not already one.
     */
    ensureModuleEntryBreakpoint(thread, source) {
        var _a;
        if (!source.path) {
            return;
        }
        // Don't apply a custom breakpoint here if the user already has one.
        const byPath = (_a = this._byPath.get(source.path)) !== null && _a !== void 0 ? _a : [];
        if (byPath.some(isSetAtEntry)) {
            return;
        }
        const key = entryBreakpoint_1.EntryBreakpoint.getModeKeyForSource(this.entryBreakpointMode, source.path);
        if (!source.path || this.moduleEntryBreakpoints.has(key)) {
            return;
        }
        const bp = new entryBreakpoint_1.EntryBreakpoint(this, source, this.entryBreakpointMode);
        this.moduleEntryBreakpoints.set(source.path, bp);
        this._setBreakpoint(bp, thread);
    }
    /**
     * Should be called when the execution context is cleared. Breakpoints set
     * on a script ID will no longer be bound correctly.
     */
    executionContextWasCleared() {
        for (const bp of this.allUserBreakpoints) {
            bp.executionContextWasCleared();
        }
    }
    /**
     * Reapplies any currently-set user defined breakpoints.
     */
    async reapply() {
        const all = [...this.allUserBreakpoints];
        await Promise.all(all.map(a => a.disable()));
        if (this._thread) {
            const thread = this._thread;
            await Promise.all(all.map(a => a.enable(thread)));
        }
    }
};
BreakpointManager = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.IDapApi)),
    __param(1, inversify_1.inject(sources_1.SourceContainer)),
    __param(2, inversify_1.inject(logging_1.ILogger)),
    __param(3, inversify_1.inject(configuration_1.AnyLaunchConfiguration)),
    __param(4, inversify_1.inject(conditions_1.IBreakpointConditionFactory)),
    __param(5, inversify_1.inject(diagnosticToolSuggester_1.DiagnosticToolSuggester)),
    __param(6, inversify_1.inject(breakpointPredictor_1.IBreakpointsPredictor))
], BreakpointManager);
exports.BreakpointManager = BreakpointManager;
//# sourceMappingURL=breakpoints.js.map
//# sourceMappingURL=breakpoints.js.map
