"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breakpoint = void 0;
const urlUtils_1 = require("../../common/urlUtils");
const sources_1 = require("../sources");
const lcEqual = (a, b) => a.lineNumber === b.lineNumber && a.columnNumber === b.columnNumber;
const isSetByUrl = (params) => !('location' in params);
const isSetByLocation = (params) => 'location' in params;
const breakpointIsForUrl = (params, url) => (params.url && url === params.url) || (params.urlRegex && new RegExp(params.urlRegex).test(url));
class Breakpoint {
    /**
     * @param manager - Associated breakpoint manager
     * @param originalPosition - The position in the UI this breakpoint was placed at
     * @param source - Source in which this breakpoint is placed
     */
    constructor(_manager, _source, _originalPosition) {
        this._manager = _manager;
        this._source = _source;
        this._originalPosition = _originalPosition;
        this.isEnabled = false;
        this.setInCdpScriptIds = new Set();
        /**
         * Returns script IDs whether this breakpoint has been resolved.
         */
        this.cdpScriptIds = this.setInCdpScriptIds;
        /**
         * A list of the CDP breakpoints that have been set from this one. Note that
         * this can be set, only through {@link Breakpoint#updateCdpRefs}
         */
        this.cdpBreakpoints = [];
        this._cdpIds = new Set();
    }
    /**
     * Returns whether this breakpoint is enabled.
     */
    get enabled() {
        return this.isEnabled;
    }
    /**
     * Gets all CDP breakpoint IDs under which this breakpoint currently exists.
     */
    get cdpIds() {
        return this._cdpIds;
    }
    /**
     * Gets the source the breakpoint is set in.
     */
    get source() {
        return this._source;
    }
    /**
     * Gets the location where the breakpoint was originally set.
     */
    get originalPosition() {
        return this._originalPosition;
    }
    /**
     * Updates the source location for the breakpoint. It is assumed that the
     * updated location is equivalent to the original on.  This is used to move
     * the breakpoints when we pretty print a source. This is dangerous with
     * sharp edges, use with caution.
     */
    async updateSourceLocation(source, uiLocation) {
        this._source = source;
        this._originalPosition = uiLocation;
        this.updateCdpRefs(list => list.map(bp => bp.state === 1 /* Applied */
            ? Object.assign(Object.assign({}, bp), { uiLocations: this._manager._sourceContainer.currentSiblingUiLocations(uiLocation) }) : bp));
    }
    /**
     * Sets the breakpoint in the provided thread and marks the "enabled" bit.
     */
    async enable(thread) {
        if (this.isEnabled) {
            return;
        }
        this.isEnabled = true;
        const promises = [this._setPredicted(thread)];
        const source = this._manager._sourceContainer.source(this.source);
        if (!source || !(source instanceof sources_1.SourceFromMap)) {
            promises.push(
            // For breakpoints set before launch, we don't know whether they are in a compiled or
            // a source map source. To make them work, we always set by url to not miss compiled.
            // Additionally, if we have two sources with the same url, but different path (or no path),
            // this will make breakpoint work in all of them.
            this._setByPath(thread, sources_1.uiToRawOffset(this.originalPosition, source === null || source === void 0 ? void 0 : source.runtimeScriptOffset)));
        }
        await Promise.all(promises);
        if (source) {
            const uiLocations = this._manager._sourceContainer.currentSiblingUiLocations({
                lineNumber: this.originalPosition.lineNumber,
                columnNumber: this.originalPosition.columnNumber,
                source,
            });
            await Promise.all(uiLocations.map(uiLocation => this._setByUiLocation(thread, sources_1.uiToRawOffset(uiLocation, source.runtimeScriptOffset))));
        }
    }
    /**
     * Updates the breakpoint's locations in the UI. Should be called whenever
     * a breakpoint set completes or a breakpointResolved event is received.
     */
    async updateUiLocations(thread, cdpId, resolvedLocations) {
        const uiLocation = (await Promise.all(resolvedLocations.map(l => thread.rawLocationToUiLocation(thread.rawLocation(l))))).find(l => !!l);
        if (!uiLocation) {
            return;
        }
        const source = this._manager._sourceContainer.source(this.source);
        if (!source) {
            return;
        }
        this.updateCdpRefs(list => list.map(bp => bp.state === 1 /* Applied */ && bp.cdpId === cdpId
            ? Object.assign(Object.assign({}, bp), { locations: resolvedLocations, uiLocations: [
                    ...bp.uiLocations,
                    ...this._manager._sourceContainer.currentSiblingUiLocations(uiLocation, source),
                ] }) : bp));
    }
    /**
     * Compares this breakpoint with the other. String comparison-style return:
     *  - a negative number if this breakpoint is before the other one
     *  - zero if they're the same location
     *  - a positive number if this breakpoint is after the other one
     */
    compare(other) {
        const lca = this.originalPosition;
        const lcb = other.originalPosition;
        return lca.lineNumber !== lcb.lineNumber
            ? lca.lineNumber - lcb.lineNumber
            : lca.columnNumber - lcb.columnNumber;
    }
    /**
     * Removes the breakpoint from CDP and sets the "enabled" bit to false.
     */
    async disable() {
        if (!this.isEnabled) {
            return;
        }
        this.isEnabled = false;
        const promises = this.cdpBreakpoints.map(bp => this.removeCdpBreakpoint(bp));
        await Promise.all(promises);
    }
    async updateForSourceMap(thread, script) {
        const source = this._manager._sourceContainer.source(this.source);
        if (!source) {
            return [];
        }
        // Find all locations for this breakpoint in the new script.
        const uiLocations = this._manager._sourceContainer.currentSiblingUiLocations({
            lineNumber: this.originalPosition.lineNumber,
            columnNumber: this.originalPosition.columnNumber,
            source,
        }, await script.source);
        if (!uiLocations.length) {
            return [];
        }
        const promises = [];
        for (const uiLocation of uiLocations) {
            promises.push(this._setByScriptId(thread, script, sources_1.uiToRawOffset(uiLocation, source.runtimeScriptOffset)));
        }
        // If we get a source map that references this script exact URL, then
        // remove any URL-set breakpoints because they are probably not correct.
        // This oft happens with Node.js loaders which rewrite sources on the fly.
        for (const bp of this.cdpBreakpoints) {
            if (!isSetByUrl(bp.args)) {
                continue;
            }
            if (!this.breakpointIsForSource(bp.args, source)) {
                continue;
            }
            // Don't remove if we just set at the same location: https://github.com/microsoft/vscode/issues/102152
            const args = bp.args;
            if (uiLocations.some(l => l.columnNumber - 1 === args.columnNumber && l.lineNumber - 1 === args.lineNumber)) {
                continue;
            }
            this._manager.logger.verbose("runtime.sourcemap" /* RuntimeSourceMap */, 'Adjusted breakpoint due to overlaid sourcemap', {
                url: source.url,
            });
            promises.push(this.removeCdpBreakpoint(bp));
        }
        await Promise.all(promises);
        return uiLocations;
    }
    /**
     * Should be called when the execution context is cleared. Breakpoints set
     * on a script ID will no longer be bound correctly.
     */
    executionContextWasCleared() {
        // only url-set breakpoints are still valid
        this.updateCdpRefs(l => l.filter(bp => isSetByUrl(bp.args)));
    }
    /**
     * Gets whether the breakpoint was set in the source by URL. Also checks
     * the rebased remote paths, since Sources are always normalized to the
     * 'local' locations, but the CDP set is for the remote.
     */
    breakpointIsForSource(args, source) {
        if (breakpointIsForUrl(args, source.url)) {
            return true;
        }
        const remotePath = this._manager._sourceContainer.sourcePathResolver.rebaseLocalToRemote(source.absolutePath);
        if (breakpointIsForUrl(args, remotePath)) {
            return true;
        }
        return false;
    }
    /**
     * Gets the condition under which this breakpoint should be hit.
     */
    getBreakCondition() {
        return undefined;
    }
    /**
     * Updates the list of CDP breakpoint references. Used to provide lifecycle
     * hooks to consumers and internal caches.
     */
    updateCdpRefs(mutator) {
        const cast = this;
        cast.cdpBreakpoints = mutator(this.cdpBreakpoints);
        const nextIdSet = new Set();
        this.setInCdpScriptIds.clear();
        for (const bp of this.cdpBreakpoints) {
            if (bp.state === 1 /* Applied */) {
                nextIdSet.add(bp.cdpId);
                for (const location of bp.locations) {
                    this.setInCdpScriptIds.add(location.scriptId);
                }
            }
        }
        this._cdpIds = nextIdSet;
    }
    async _setPredicted(thread) {
        if (!this.source.path || !this._manager._breakpointsPredictor) {
            return;
        }
        const workspaceLocations = this._manager._breakpointsPredictor.predictedResolvedLocations({
            absolutePath: this.source.path,
            lineNumber: this.originalPosition.lineNumber,
            columnNumber: this.originalPosition.columnNumber,
        });
        const promises = [];
        for (const workspaceLocation of workspaceLocations) {
            promises.push(this._manager._sourceContainer.sourcePathResolver
                .absolutePathToUrlRegexp(workspaceLocation.absolutePath)
                .then(re => {
                if (re) {
                    return this._setByUrlRegexp(thread, re, workspaceLocation);
                }
            }));
        }
        await Promise.all(promises);
    }
    async _setByUiLocation(thread, uiLocation) {
        const promises = [];
        const scripts = thread.scriptsFromSource(uiLocation.source);
        for (const script of scripts)
            promises.push(this._setByScriptId(thread, script, uiLocation));
        await Promise.all(promises);
    }
    async _setByPath(thread, lineColumn) {
        const sourceByPath = this._manager._sourceContainer.source({ path: this.source.path });
        // If the source has been mapped in-place, don't set anything by path,
        // we'll depend only on the mapped locations.
        if (sourceByPath instanceof sources_1.SourceFromMap) {
            const mappedInPlace = [...sourceByPath.compiledToSourceUrl.keys()].some(s => s.absolutePath === this.source.path);
            if (mappedInPlace) {
                return;
            }
        }
        if (this.source.path) {
            const urlRegexp = await this._manager._sourceContainer.sourcePathResolver.absolutePathToUrlRegexp(this.source.path);
            if (!urlRegexp) {
                return;
            }
            await this._setByUrlRegexp(thread, urlRegexp, lineColumn);
        }
        else {
            const source = this._manager._sourceContainer.source(this.source);
            const url = source === null || source === void 0 ? void 0 : source.url;
            if (!url) {
                return;
            }
            await this._setByUrl(thread, url, lineColumn);
            if (this.source.path !== url && this.source.path !== undefined) {
                await this._setByUrl(thread, urlUtils_1.absolutePathToFileUrl(this.source.path), lineColumn);
            }
        }
    }
    /**
     * Returns whether a breakpoint has been set on the given line and column
     * at the provided script already. This is used to deduplicate breakpoint
     * requests to avoid triggering any logpoint breakpoints multiple times,
     * as would happen if we set a breakpoint both by script and URL.
     */
    hasSetOnLocation(script, lineColumn) {
        return this.cdpBreakpoints.find(bp => {
            var _a;
            return (script.scriptId &&
                isSetByLocation(bp.args) &&
                bp.args.location.scriptId === script.scriptId &&
                lcEqual(bp.args.location, lineColumn)) ||
                (script.url &&
                    isSetByUrl(bp.args) &&
                    new RegExp((_a = bp.args.urlRegex) !== null && _a !== void 0 ? _a : '').test(script.url) &&
                    lcEqual(bp.args, lineColumn));
        });
    }
    /**
     * Returns whether a breakpoint has been set on the given line and column
     * at the provided script by url regexp already. This is used to deduplicate breakpoint
     * requests to avoid triggering any logpoint breakpoints multiple times.
     */
    hasSetOnLocationByRegexp(urlRegexp, lineColumn) {
        return this.cdpBreakpoints.find(bp => {
            if (isSetByUrl(bp.args)) {
                return bp.args.urlRegex === urlRegexp && lcEqual(bp.args, lineColumn);
            }
            const script = this._manager._sourceContainer.scriptsById.get(bp.args.location.scriptId);
            if (script) {
                return lcEqual(bp.args.location, lineColumn) && new RegExp(urlRegexp).test(script.url);
            }
            return undefined;
        });
    }
    async _setByUrl(thread, url, lineColumn) {
        return this._setByUrlRegexp(thread, urlUtils_1.urlToRegex(url), lineColumn);
    }
    async _setByUrlRegexp(thread, urlRegex, lineColumn) {
        lineColumn = sources_1.base1To0(lineColumn);
        const previous = this.hasSetOnLocationByRegexp(urlRegex, lineColumn);
        if (previous) {
            if (previous.state === 0 /* Pending */) {
                await previous.done;
            }
            return;
        }
        return this._setAny(thread, Object.assign({ urlRegex, condition: this.getBreakCondition() }, lineColumn));
    }
    async _setByScriptId(thread, script, lineColumn) {
        lineColumn = sources_1.base1To0(lineColumn);
        // Avoid setting duplicate breakpoints
        const previous = this.hasSetOnLocation(script, lineColumn);
        if (previous) {
            if (previous.state === 0 /* Pending */) {
                await previous.done;
            }
            return;
        }
        return this._setAny(thread, {
            condition: this.getBreakCondition(),
            location: Object.assign({ scriptId: script.scriptId }, lineColumn),
        });
    }
    /**
     * Sets a breakpoint on the thread using the given set of arguments
     * to Debugger.setBreakpoint or Debugger.setBreakpointByUrl.
     */
    async _setAny(thread, args) {
        // If disabled while still setting, don't go on to try to set it and leak.
        // If we're disabled after this point, we'll be recorded in the CDP refs
        // list and will be deadlettered.
        if (!this.isEnabled) {
            return;
        }
        const state = {
            state: 0 /* Pending */,
            args,
            deadletter: false,
        };
        state.done = (async () => {
            const result = isSetByLocation(args)
                ? await thread.cdp().Debugger.setBreakpoint(args)
                : await thread.cdp().Debugger.setBreakpointByUrl(args);
            if (!result) {
                return;
            }
            if (state.deadletter) {
                await thread.cdp().Debugger.removeBreakpoint({ breakpointId: result.breakpointId });
                return;
            }
            const locations = 'actualLocation' in result ? [result.actualLocation] : result.locations;
            this._manager._resolvedBreakpoints.set(result.breakpointId, this);
            // Note that we add the record after calling breakpointResolved()
            // to avoid duplicating locations.
            const next = {
                state: 1 /* Applied */,
                cdpId: result.breakpointId,
                args,
                locations,
                uiLocations: [],
            };
            this.updateCdpRefs(list => list.map(r => (r === state ? next : r)));
            await this.updateUiLocations(thread, result.breakpointId, locations);
            return next;
        })();
        this.updateCdpRefs(list => [...list, state]);
        await state.done;
    }
    /**
     * Removes a CDP breakpoint attached to this one. Deadletters it if it
     * hasn't been applied yet, deletes it immediately otherwise.
     */
    async removeCdpBreakpoint(breakpoint) {
        var _a;
        this.updateCdpRefs(bps => bps.filter(bp => bp !== breakpoint));
        if (breakpoint.state === 0 /* Pending */) {
            breakpoint.deadletter = true;
            await breakpoint.done;
        }
        else {
            await ((_a = this._manager._thread) === null || _a === void 0 ? void 0 : _a.cdp().Debugger.removeBreakpoint({ breakpointId: breakpoint.cdpId }));
            this._manager._resolvedBreakpoints.delete(breakpoint.cdpId);
        }
    }
}
exports.Breakpoint = Breakpoint;
//# sourceMappingURL=breakpointBase.js.map
//# sourceMappingURL=breakpointBase.js.map
