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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ScriptSkipper_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptSkipper = void 0;
const inversify_1 = require("inversify");
const micromatch_1 = __importDefault(require("micromatch"));
const connection_1 = require("../../cdp/connection");
const mapUsingProjection_1 = require("../../common/datastructure/mapUsingProjection");
const events_1 = require("../../common/events");
const logging_1 = require("../../common/logging");
const node15Internal_1 = require("../../common/node15Internal");
const objUtils_1 = require("../../common/objUtils");
const pathUtils = __importStar(require("../../common/pathUtils"));
const promiseUtil_1 = require("../../common/promiseUtil");
const stringUtils_1 = require("../../common/stringUtils");
const urlUtils = __importStar(require("../../common/urlUtils"));
const configuration_1 = require("../../configuration");
const targets_1 = require("../../targets/targets");
const sources_1 = require("../sources");
const templates_1 = require("../templates");
let ScriptSkipper = ScriptSkipper_1 = class ScriptSkipper {
    constructor({ skipFiles }, logger, cdp, target) {
        this.logger = logger;
        this.cdp = cdp;
        this._nonNodeInternalGlobs = null;
        // filtering node internals
        this._nodeInternalsGlobs = null;
        /**
         * A set of script ID that have one or more skipped ranges in them. Mostly
         * used to avoid unnecessarily sending skip data for new scripts.
         */
        this._scriptsWithSkipping = new Set();
        this._targetId = target.id();
        this._rootTargetId = getRootTarget(target).id();
        this._isUrlSkipped = new mapUsingProjection_1.MapUsingProjection(key => this._normalizeUrl(key));
        this._isAuthoredUrlSkipped = new mapUsingProjection_1.MapUsingProjection(key => this._normalizeUrl(key));
        this._preprocessNodeInternals(skipFiles);
        this._setRegexForNonNodeInternals(skipFiles);
        this._initNodeInternals(target); // Purposely don't wait, no need to slow things down
        this._updateSkippedDebounce = objUtils_1.trailingEdgeThrottle(500, () => this._updateGeneratedSkippedSources());
        ScriptSkipper_1.sharedSkipsEmitter.event(e => {
            if (e.rootTargetId === this._rootTargetId && e.targetId !== this._targetId) {
                this._toggleSkippingFile(e.params);
            }
        });
    }
    setSourceContainer(sourceContainer) {
        this._sourceContainer = sourceContainer;
    }
    _preprocessNodeInternals(userSkipPatterns) {
        const nodeInternalRegex = /^<node_internals>[\/\\](.*)$/;
        const nodeInternalPatterns = userSkipPatterns
            .map(userPattern => {
            userPattern = userPattern.trim();
            const nodeInternalPattern = nodeInternalRegex.exec(userPattern);
            return nodeInternalPattern ? nodeInternalPattern[1] : null;
        })
            .filter(nonNullPattern => nonNullPattern);
        if (nodeInternalPatterns.length > 0) {
            this._nodeInternalsGlobs = nodeInternalPatterns;
        }
    }
    _setRegexForNonNodeInternals(userSkipPatterns) {
        const nonNodeInternalGlobs = userSkipPatterns
            .filter(pattern => !pattern.includes('<node_internals>'))
            .map(pattern => pathUtils.forceForwardSlashes(pattern))
            .map(urlUtils.lowerCaseInsensitivePath);
        if (nonNodeInternalGlobs.length > 0) {
            this._nonNodeInternalGlobs = nonNodeInternalGlobs;
        }
    }
    _testSkipNodeInternal(testString) {
        if (!this._nodeInternalsGlobs) {
            return false;
        }
        if (testString.startsWith(node15Internal_1.node15InternalsPrefix)) {
            testString = testString.slice(node15Internal_1.node15InternalsPrefix.length);
        }
        return micromatch_1.default([testString], this._nodeInternalsGlobs).length > 0;
    }
    _testSkipNonNodeInternal(testString) {
        if (this._nonNodeInternalGlobs) {
            return (micromatch_1.default([urlUtils.lowerCaseInsensitivePath(pathUtils.forceForwardSlashes(testString))], this._nonNodeInternalGlobs, { dot: true }).length > 0);
        }
        return false;
    }
    _isNodeInternal(url, nodeInternals) {
        if (url.startsWith(node15Internal_1.node15InternalsPrefix)) {
            return true;
        }
        return (nodeInternals === null || nodeInternals === void 0 ? void 0 : nodeInternals.has(url)) || /^internal\/.+\.js$/.test(url);
    }
    async _updateBlackboxedUrls(urlsToBlackbox) {
        const blackboxPatterns = urlsToBlackbox
            .map(url => stringUtils_1.escapeRegexSpecialChars(url))
            .map(url => `^${url}$`);
        await this.cdp.Debugger.setBlackboxPatterns({ patterns: blackboxPatterns });
    }
    _updateGeneratedSkippedSources() {
        const urlsToSkip = [];
        for (const [url, isSkipped] of this._isUrlSkipped.entries()) {
            if (isSkipped) {
                urlsToSkip.push(url);
            }
        }
        return this._updateBlackboxedUrls(urlsToSkip);
    }
    _normalizeUrl(url) {
        return pathUtils.forceForwardSlashes(url.toLowerCase());
    }
    isScriptSkipped(url) {
        const norm = this._normalizeUrl(url);
        return this._isUrlSkipped.get(norm) === true || this._isAuthoredUrlSkipped.get(norm) === true;
    }
    async _updateSourceWithSkippedSourceMappedSources(source, scriptIds) {
        // Order "should" be correct
        const parentIsSkipped = this.isScriptSkipped(source.url);
        const skipRanges = [];
        let inSkipRange = parentIsSkipped;
        Array.from(source.sourceMap.sourceByUrl.values()).forEach(authoredSource => {
            let isSkippedSource = this.isScriptSkipped(authoredSource.url);
            if (typeof isSkippedSource === 'undefined') {
                // If not toggled or specified in launch config, inherit the parent's status
                isSkippedSource = parentIsSkipped;
            }
            if (isSkippedSource !== inSkipRange) {
                const locations = this._sourceContainer.currentSiblingUiLocations({ source: authoredSource, lineNumber: 1, columnNumber: 1 }, source);
                if (locations[0]) {
                    skipRanges.push({
                        lineNumber: locations[0].lineNumber - 1,
                        columnNumber: locations[0].columnNumber - 1,
                    });
                    inSkipRange = !inSkipRange;
                }
                else {
                    this.logger.error("internal" /* Internal */, 'Could not map script beginning for ' + authoredSource.sourceReference);
                }
            }
        });
        let targets = scriptIds;
        if (!skipRanges.length) {
            targets = targets.filter(t => this._scriptsWithSkipping.has(t));
            targets.forEach(t => this._scriptsWithSkipping.delete(t));
        }
        await Promise.all(targets.map(scriptId => this.cdp.Debugger.setBlackboxedRanges({ scriptId, positions: skipRanges })));
    }
    initializeSkippingValueForSource(source) {
        var _a;
        const nodeInternals = (_a = this._allNodeInternals) === null || _a === void 0 ? void 0 : _a.settledValue;
        if (this._allNodeInternals && !nodeInternals) {
            this._allNodeInternals.promise.then(v => this._initializeSkippingValueForSource(source, v));
        }
        else {
            this._initializeSkippingValueForSource(source, nodeInternals);
        }
    }
    _initializeSkippingValueForSource(source, nodeInternals, scriptIds = source.scriptIds()) {
        const map = source instanceof sources_1.SourceFromMap ? this._isAuthoredUrlSkipped : this._isUrlSkipped;
        const url = source.url;
        if (!map.has(this._normalizeUrl(url))) {
            if (this._isNodeInternal(url, nodeInternals)) {
                map.set(url, this._testSkipNodeInternal(url));
            }
            else if (source.absolutePath) {
                map.set(url, this._testSkipNonNodeInternal(source.absolutePath));
            }
            else {
                map.set(url, this._testSkipNonNodeInternal(url));
            }
        }
        let hasSkip = this.isScriptSkipped(url);
        if (hasSkip) {
            if (sources_1.isSourceWithMap(source)) {
                // if compiled and skipped, also skip authored sources
                const authoredSources = Array.from(source.sourceMap.sourceByUrl.values());
                authoredSources.forEach(authoredSource => {
                    this._isAuthoredUrlSkipped.set(authoredSource.url, true);
                });
            }
        }
        if (sources_1.isSourceWithMap(source)) {
            for (const nestedSource of source.sourceMap.sourceByUrl.values()) {
                hasSkip =
                    this._initializeSkippingValueForSource(nestedSource, nodeInternals, scriptIds) || hasSkip;
            }
            this._updateSourceWithSkippedSourceMappedSources(source, scriptIds);
        }
        if (hasSkip) {
            this._updateSkippedDebounce();
        }
        return hasSkip;
    }
    async _initNodeInternals(target) {
        if (target.type() !== 'node' || !this._nodeInternalsGlobs || this._allNodeInternals) {
            return;
        }
        const deferred = (this._allNodeInternals = promiseUtil_1.getDeferred());
        const evalResult = await this.cdp.Runtime.evaluate({
            expression: "require('module').builtinModules" + templates_1.getSourceSuffix(),
            returnByValue: true,
            includeCommandLineAPI: true,
        });
        if (evalResult && !evalResult.exceptionDetails) {
            deferred.resolve(new Set(evalResult.result.value.map(name => name + '.js')));
        }
        else {
            deferred.resolve(new Set());
        }
    }
    async _toggleSkippingFile(params) {
        let path = undefined;
        if (params.resource) {
            if (urlUtils.isAbsolute(params.resource)) {
                path = params.resource;
            }
        }
        const sourceParams = { path: path, sourceReference: params.sourceReference };
        const source = this._sourceContainer.source(sourceParams);
        if (source) {
            const newSkipValue = !this.isScriptSkipped(source.url);
            if (source instanceof sources_1.SourceFromMap) {
                this._isAuthoredUrlSkipped.set(source.url, newSkipValue);
                // Changed the skip value for an authored source, update it for all its compiled sources
                const compiledSources = Array.from(source.compiledToSourceUrl.keys());
                await Promise.all(compiledSources.map(compiledSource => this._updateSourceWithSkippedSourceMappedSources(compiledSource, compiledSource.scriptIds())));
            }
            else {
                this._isUrlSkipped.set(source.url, newSkipValue);
                if (sources_1.isSourceWithMap(source)) {
                    // if compiled, get authored sources
                    for (const authoredSource of source.sourceMap.sourceByUrl.values()) {
                        this._isAuthoredUrlSkipped.set(authoredSource.url, newSkipValue);
                    }
                }
            }
            await this._updateGeneratedSkippedSources();
        }
        return {};
    }
    async toggleSkippingFile(params) {
        const result = await this._toggleSkippingFile(params);
        ScriptSkipper_1.sharedSkipsEmitter.fire({
            params,
            rootTargetId: this._rootTargetId,
            targetId: this._targetId,
        });
        return result;
    }
};
ScriptSkipper.sharedSkipsEmitter = new events_1.EventEmitter();
ScriptSkipper = ScriptSkipper_1 = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(configuration_1.AnyLaunchConfiguration)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(connection_1.ICdpApi)),
    __param(3, inversify_1.inject(targets_1.ITarget))
], ScriptSkipper);
exports.ScriptSkipper = ScriptSkipper;
function getRootTarget(target) {
    const parent = target.parent();
    if (parent) {
        return getRootTarget(parent);
    }
    else {
        return target;
    }
}
//# sourceMappingURL=implementation.js.map
//# sourceMappingURL=implementation.js.map
