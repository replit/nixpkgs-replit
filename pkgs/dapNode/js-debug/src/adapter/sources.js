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
exports.base1To0 = exports.base0To1 = exports.rawToUiOffset = exports.uiToRawOffset = exports.SourceContainer = exports.UnmappedReason = exports.isSourceWithMap = exports.SourceFromMap = exports.Source = void 0;
const inversify_1 = require("inversify");
const js_xxhash_1 = require("js-xxhash");
const path_1 = require("path");
const source_map_1 = require("source-map");
const url_1 = require("url");
const nls = __importStar(require("vscode-nls"));
const mapUsingProjection_1 = require("../common/datastructure/mapUsingProjection");
const events_1 = require("../common/events");
const logging_1 = require("../common/logging");
const objUtils_1 = require("../common/objUtils");
const pathUtils_1 = require("../common/pathUtils");
const promiseUtil_1 = require("../common/promiseUtil");
const sourceMapFactory_1 = require("../common/sourceMaps/sourceMapFactory");
const sourcePathResolver_1 = require("../common/sourcePathResolver");
const sourceUtils = __importStar(require("../common/sourceUtils"));
const sourceUtils_1 = require("../common/sourceUtils");
const utils = __importStar(require("../common/urlUtils"));
const configuration_1 = require("../configuration");
const connection_1 = require("../dap/connection");
const errors_1 = require("../dap/errors");
const ioc_extras_1 = require("../ioc-extras");
const dapTelemetryReporter_1 = require("../telemetry/dapTelemetryReporter");
const resourceProvider_1 = require("./resourceProvider");
const scriptSkipper_1 = require("./scriptSkipper/scriptSkipper");
const localize = nls.loadMessageBundle();
function isUiLocation(loc) {
    return (typeof loc.lineNumber === 'number' &&
        typeof loc.columnNumber === 'number' &&
        !!loc.source);
}
const getFallbackPosition = () => ({
    source: null,
    line: null,
    column: null,
    name: null,
    lastColumn: null,
    isSourceMapLoadFailure: true,
});
const defaultTimeouts = {
    load: 0,
    resolveLocation: 2000,
    sourceMapMinPause: 1000,
    output: 1000,
    sourceMapCumulativePause: 10000,
};
// Represents a text source visible to the user.
//
// Source maps flow (start with compiled1 and compiled2). Two different compiled sources
// reference to the same source map, and produce two different resolved urls leading
// to different source map sources. This is a corner case, usually there is a single
// resolved url and a single source map source per each sourceUrl in the source map.
//
//       ------> sourceMapUrl -> SourceContainer._sourceMaps -> SourceMapData -> map
//       |    |                                                                    |
//       |    compiled1  - - - - - - -  source1 <-- resolvedUrl1 <-- sourceUrl <----
//       |                                                                         |
//      compiled2  - - - - - - - - - -  source2 <-- resolvedUrl2 <-- sourceUrl <----
//
// compiled1 and source1 are connected (same goes for compiled2 and source2):
//    compiled1._sourceMapSourceByUrl.get(sourceUrl) === source1
//    source1._compiledToSourceUrl.get(compiled1) === sourceUrl
//
class Source {
    /**
     * @param inlineScriptOffset Offset of the start location of the script in
     * its source file. This is used on scripts in HTML pages, where the script
     * is nested in the content.
     * @param contentHash Optional hash of the file contents. This is used to
     * check whether the script we get is the same one as what's on disk. This
     * can be used to detect in-place transpilation.
     * @param runtimeScriptOffset Offset of the start location of the script
     * in the runtime *only*. This differs from the inlineScriptOffset, as the
     * inline offset of also reflected in the file. This is used to deal with
     * the runtime wrapping the source and offsetting locations which should
     * not be shown to the user.
     */
    constructor(container, url, absolutePath, contentGetter, sourceMapUrl, inlineScriptOffset, runtimeScriptOffset, contentHash) {
        this.url = url;
        this.inlineScriptOffset = inlineScriptOffset;
        this.runtimeScriptOffset = runtimeScriptOffset;
        this._scriptIds = [];
        this.sourceReference = container.getSourceReference(url);
        this._contentGetter = objUtils_1.once(contentGetter);
        this._container = container;
        this.absolutePath = absolutePath || '';
        this._fqname = this._fullyQualifiedName();
        this._name = this._humanName();
        this.setSourceMapUrl(sourceMapUrl);
        this._existingAbsolutePath = sourceUtils.checkContentHash(this.absolutePath, 
        // Inline scripts will never match content of the html file. We skip the content check.
        inlineScriptOffset || runtimeScriptOffset ? undefined : contentHash, container._fileContentOverridesForTest.get(this.absolutePath));
    }
    setSourceMapUrl(sourceMapUrl) {
        if (!sourceMapUrl) {
            this.sourceMap = undefined;
            return;
        }
        this.sourceMap = {
            url: sourceMapUrl,
            sourceByUrl: new Map(),
            metadata: {
                sourceMapUrl,
                compiledPath: this.absolutePath || this.url,
            },
        };
    }
    addScriptId(scriptId) {
        this._scriptIds.push(scriptId);
    }
    scriptIds() {
        return this._scriptIds;
    }
    async content() {
        var _a;
        let content = await this._contentGetter();
        // pad for the inline source offset, see
        // https://github.com/microsoft/vscode-js-debug/issues/736
        if ((_a = this.inlineScriptOffset) === null || _a === void 0 ? void 0 : _a.lineOffset) {
            content = '\n'.repeat(this.inlineScriptOffset.lineOffset) + content;
        }
        return content;
    }
    mimeType() {
        return 'text/javascript';
    }
    /**
     * Gets whether this source is able to be pretty-printed.
     */
    canPrettyPrint() {
        return this._container && !this._name.endsWith('-pretty.js');
    }
    /**
     * Pretty-prints the source. Generates a beauitified source map if possible
     * and it hasn't already been done, and returns the created map and created
     * ephemeral source. Returns undefined if the source can't be beautified.
     */
    async prettyPrint() {
        var _a, _b;
        if (!this._container || !this.canPrettyPrint()) {
            return undefined;
        }
        if (exports.isSourceWithMap(this) && this.sourceMap.url.endsWith('-pretty.map')) {
            const map = (_b = this._container._sourceMaps.get((_a = this.sourceMap) === null || _a === void 0 ? void 0 : _a.url)) === null || _b === void 0 ? void 0 : _b.map;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return map && { map, source: [...this.sourceMap.sourceByUrl.values()][0] };
        }
        const content = await this.content();
        if (!content) {
            return undefined;
        }
        // Eval'd scripts have empty urls, give them a temporary one for the purpose
        // of the sourcemap. See #929
        const baseUrl = this.url || `eval://${this.sourceReference}.js`;
        const sourceMapUrl = baseUrl + '-pretty.map';
        const basename = baseUrl.split(/[\/\\]/).pop();
        const fileName = basename + '-pretty.js';
        const map = await sourceUtils_1.prettyPrintAsSourceMap(fileName, content, baseUrl, sourceMapUrl);
        if (!map) {
            return undefined;
        }
        // Note: this overwrites existing source map.
        this.setSourceMapUrl(sourceMapUrl);
        const asCompiled = this;
        const sourceMap = {
            compiled: new Set([asCompiled]),
            map,
            loaded: Promise.resolve(),
        };
        this._container._sourceMaps.set(sourceMapUrl, sourceMap);
        await this._container._addSourceMapSources(asCompiled, map);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { map, source: [...asCompiled.sourceMap.sourceByUrl.values()][0] };
    }
    /**
     * Returns a DAP representation of the source.
     */
    async toDap() {
        return this.toDapShallow();
    }
    /**
     * Returns a DAP representation without including any nested sources.
     */
    async toDapShallow() {
        const existingAbsolutePath = await this._existingAbsolutePath;
        const dap = {
            name: this._name,
            path: this._fqname,
            sourceReference: this.sourceReference,
            presentationHint: this.blackboxed() ? 'deemphasize' : undefined,
            origin: this.blackboxed() ? localize('source.skipFiles', 'Skipped by skipFiles') : undefined,
        };
        if (existingAbsolutePath) {
            dap.sourceReference = 0;
            dap.path = existingAbsolutePath;
        }
        return dap;
    }
    existingAbsolutePath() {
        return this._existingAbsolutePath;
    }
    async prettyName() {
        const path = await this._existingAbsolutePath;
        if (path)
            return path;
        return this._fqname;
    }
    /**
     * Gets the human-readable name of the source.
     */
    _humanName() {
        if (utils.isAbsolute(this._fqname)) {
            for (const root of this._container.rootPaths) {
                if (pathUtils_1.isSubdirectoryOf(root, this._fqname)) {
                    return pathUtils_1.forceForwardSlashes(path_1.relative(root, this._fqname));
                }
            }
        }
        return this._fqname;
    }
    /**
     * Returns a pretty name for the script. This is the name displayed in
     * stack traces and returned through DAP if the file does not verifiably
     * exist on disk.
     */
    _fullyQualifiedName() {
        var _a;
        if (!this.url) {
            return '<eval>/VM' + this.sourceReference;
        }
        if (this.absolutePath.startsWith('<node_internals>')) {
            return this.absolutePath;
        }
        if (utils.isAbsolute(this.url)) {
            return this.url;
        }
        const parsedAbsolute = utils.fileUrlToAbsolutePath(this.url);
        if (parsedAbsolute) {
            return parsedAbsolute;
        }
        let fqname = this.url;
        try {
            const tokens = [];
            const url = new url_1.URL(this.url);
            if (url.protocol === 'data:') {
                return '<eval>/VM' + this.sourceReference;
            }
            if (url.hostname) {
                tokens.push(url.hostname);
            }
            if (url.port) {
                tokens.push('\uA789' + url.port); // : in unicode
            }
            if (url.pathname) {
                tokens.push(/^\/[a-z]:/.test(url.pathname) ? url.pathname.slice(1) : url.pathname);
            }
            const searchParams = (_a = url.searchParams) === null || _a === void 0 ? void 0 : _a.toString();
            if (searchParams) {
                tokens.push('?' + searchParams);
            }
            fqname = tokens.join('');
        }
        catch (e) {
            // ignored
        }
        if (fqname.endsWith('/')) {
            fqname += '(index)';
        }
        if (this.inlineScriptOffset) {
            fqname += `\uA789${this.inlineScriptOffset.lineOffset + 1}:${this.inlineScriptOffset.columnOffset + 1}`;
        }
        return fqname;
    }
    /**
     * Gets whether this script is blackboxed (part of the skipfiles).
     */
    blackboxed() {
        return this._container.isSourceSkipped(this.url);
    }
}
exports.Source = Source;
/**
 * A Source generated from a sourcemap. For example, a TypeScript input file
 * discovered from its compiled JavaScript code.
 */
class SourceFromMap extends Source {
    constructor() {
        super(...arguments);
        // Sources generated from the source map are referenced by some compiled sources
        // (through a source map). This map holds the original |sourceUrl| as written in the
        // source map, which was used to produce this source for each compiled.
        this.compiledToSourceUrl = new Map();
    }
}
exports.SourceFromMap = SourceFromMap;
exports.isSourceWithMap = (source) => !!source && source instanceof Source && !!source.sourceMap;
const isOriginalSourceOf = (compiled, original) => original instanceof SourceFromMap && original.compiledToSourceUrl.has(compiled);
var UnmappedReason;
(function (UnmappedReason) {
    /** The map has been disabled temporarily, due to setting a breakpoint in a compiled script */
    UnmappedReason[UnmappedReason["MapDisabled"] = 0] = "MapDisabled";
    /** The source in the UI location has no map */
    UnmappedReason[UnmappedReason["HasNoMap"] = 1] = "HasNoMap";
    /** The location cannot be source mapped due to an error loading the map */
    UnmappedReason[UnmappedReason["MapLoadingFailed"] = 2] = "MapLoadingFailed";
    /** The location cannot be source mapped due to its position not being present in the map */
    UnmappedReason[UnmappedReason["MapPositionMissing"] = 3] = "MapPositionMissing";
    /**
     * The location cannot be sourcemapped, due to not having a sourcemap,
     * failing to load the sourcemap, not having a mapping in the sourcemap, etc
     */
    UnmappedReason[UnmappedReason["CannotMap"] = 4] = "CannotMap";
})(UnmappedReason = exports.UnmappedReason || (exports.UnmappedReason = {}));
const maxInt32 = 2 ** 31 - 1;
let SourceContainer = class SourceContainer {
    constructor(dap, sourceMapFactory, logger, launchConfig, initializeConfig, sourcePathResolver, scriptSkipper, resourceProvider) {
        this.sourceMapFactory = sourceMapFactory;
        this.logger = logger;
        this.launchConfig = launchConfig;
        this.initializeConfig = initializeConfig;
        this.sourcePathResolver = sourcePathResolver;
        this.scriptSkipper = scriptSkipper;
        this.resourceProvider = resourceProvider;
        /**
         * Project root path, if set.
         */
        this.rootPaths = [];
        /**
         * Mapping of CDP script IDs to Script objects.
         */
        this.scriptsById = new Map();
        this.onScriptEmitter = new events_1.EventEmitter();
        this._sourceByOriginalUrl = new mapUsingProjection_1.MapUsingProjection(s => s.toLowerCase());
        this._sourceByReference = new Map();
        this._sourceMapSourcesByUrl = new Map();
        this._sourceByAbsolutePath = utils.caseNormalizedMap();
        // All source maps by url.
        this._sourceMaps = new Map();
        this._sourceMapTimeouts = defaultTimeouts;
        // Test support.
        this._fileContentOverridesForTest = new Map();
        /**
         * Map of sources with maps that are disabled temporarily. This can happen
         * if stepping stepping in or setting breakpoints in disabled files.
         */
        this._temporarilyDisabledSourceMaps = new Set();
        /**
         * Map of sources with maps that are disabled for the length of the debug
         * session. This can happen if manually disabling sourcemaps for a file
         * (as a result of a missing source, for instance)
         */
        this._permanentlyDisabledSourceMaps = new Set();
        /**
         * Fires when a new script is parsed.
         */
        this.onScript = this.onScriptEmitter.event;
        this._statistics = { fallbackSourceMapCount: 0 };
        this._dap = dap;
        const mainRootPath = 'webRoot' in launchConfig ? launchConfig.webRoot : launchConfig.rootPath;
        if (mainRootPath) {
            // Prefixing ../ClientApp is a workaround for a bug in ASP.NET debugging in VisualStudio because the wwwroot is not properly configured
            this.rootPaths = [mainRootPath, pathUtils_1.properResolve(mainRootPath, '..', 'ClientApp')];
        }
        scriptSkipper.setSourceContainer(this);
        this.setSourceMapTimeouts(Object.assign(Object.assign({}, this.sourceMapTimeouts()), launchConfig.timeouts));
    }
    /*
     * Gets an iterator for all sources in the collection.
     */
    get sources() {
        return this._sourceByReference.values();
    }
    /**
     * Gets statistics for telemetry
     */
    statistics() {
        return this._statistics;
    }
    setSourceMapTimeouts(sourceMapTimeouts) {
        this._sourceMapTimeouts = sourceMapTimeouts;
    }
    sourceMapTimeouts() {
        return this._sourceMapTimeouts;
    }
    setFileContentOverrideForTest(absolutePath, content) {
        if (content === undefined)
            this._fileContentOverridesForTest.delete(absolutePath);
        else
            this._fileContentOverridesForTest.set(absolutePath, content);
    }
    /**
     * Returns DAP objects for every loaded source in the container.
     */
    async loadedSources() {
        const promises = [];
        for (const source of this._sourceByReference.values())
            promises.push(source.toDap());
        return await Promise.all(promises);
    }
    /**
     * Gets the Source object by DAP reference, first by sourceReference and
     * then by path.
     */
    source(ref) {
        if (ref.sourceReference)
            return this._sourceByReference.get(ref.sourceReference);
        if (ref.path)
            return this._sourceByAbsolutePath.get(ref.path);
        return undefined;
    }
    /**
     * Gets whether the source is skipped.
     */
    isSourceSkipped(url) {
        return this.scriptSkipper.isScriptSkipped(url);
    }
    /**
     * Adds a new script to the source container.
     */
    addScriptById(script) {
        this.scriptsById.set(script.scriptId, script);
        this.onScriptEmitter.fire(script);
    }
    /**
     * Gets a source by its original URL from the debugger.
     */
    getSourceByOriginalUrl(url) {
        return this._sourceByOriginalUrl.get(url);
    }
    /**
     * Gets the source preferred source reference for a script. We generate this
     * determistically so that breakpoints have a good chance of being preserved
     * between reloads; previously, we had an incrementing source reference, but
     * this led to breakpoints being lost when the debug session got restarted.
     *
     * Note that the reference returned from this function is *only* used for
     * files that don't exist on disk; the ones that do exist always are
     * rewritten to source reference ID 0.
     */
    getSourceReference(url) {
        let id = js_xxhash_1.xxHash32(url) & maxInt32; // xxHash32 is a u32, mask again the max positive int32 value
        for (let i = 0; i < 0xffff; i++) {
            if (!this._sourceByReference.has(id)) {
                return id;
            }
            if (id === maxInt32) {
                // DAP spec says max reference ID is 2^31 - 1, int32
                id = 0;
            }
            id++;
        }
        this.logger.assert(false, 'Max iterations exceeding for source reference assignment');
        return id; // conflicts, but it's better than nothing, maybe?
    }
    /**
     * This method returns a "preferred" location. This usually means going
     * through a source map and showing the source map source instead of a
     * compiled one. We use timeout to avoid waiting for the source map for too long.
     */
    async preferredUiLocation(uiLocation) {
        let isMapped = false;
        let unmappedReason = UnmappedReason.CannotMap;
        while (true) {
            if (!exports.isSourceWithMap(uiLocation.source)) {
                break;
            }
            const sourceMap = this._sourceMaps.get(uiLocation.source.sourceMap.url);
            if (!this.logger.assert(sourceMap, `Expected to have sourcemap for loaded source ${uiLocation.source.sourceMap.url}`)) {
                break;
            }
            await Promise.race([sourceMap.loaded, promiseUtil_1.delay(this._sourceMapTimeouts.resolveLocation)]);
            if (!sourceMap.map)
                return Object.assign(Object.assign({}, uiLocation), { isMapped, unmappedReason });
            const sourceMapped = this._sourceMappedUiLocation(uiLocation, sourceMap.map);
            if (!isUiLocation(sourceMapped)) {
                unmappedReason = isMapped ? undefined : sourceMapped;
                break;
            }
            uiLocation = sourceMapped;
            isMapped = true;
            unmappedReason = undefined;
        }
        return Object.assign(Object.assign({}, uiLocation), { isMapped, unmappedReason });
    }
    /**
     * This method shows all possible locations for a given one. For example, all
     * compiled sources which refer to the same source map will be returned given
     * the location in source map source. This method does not wait for the
     * source map to be loaded.
     */
    currentSiblingUiLocations(uiLocation, inSource) {
        return this._uiLocations(uiLocation).filter(uiLocation => !inSource || uiLocation.source === inSource);
    }
    /**
     * Clears all sources in the container.
     */
    clear(silent) {
        this.scriptsById.clear();
        for (const source of this._sourceByReference.values()) {
            this.removeSource(source, silent);
        }
        this._sourceByReference.clear();
        if (this.sourceMapFactory instanceof sourceMapFactory_1.CachingSourceMapFactory) {
            this.sourceMapFactory.invalidateCache();
        }
    }
    /**
     * Returns all the possible locations the given location can map to or from,
     * taking into account source maps.
     */
    _uiLocations(uiLocation) {
        return [
            ...this.getSourceMapUiLocations(uiLocation),
            uiLocation,
            ...this.getCompiledLocations(uiLocation),
        ];
    }
    /**
     * Returns all UI locations the given location maps to.
     */
    getSourceMapUiLocations(uiLocation) {
        var _a;
        if (!exports.isSourceWithMap(uiLocation.source))
            return [];
        const map = (_a = this._sourceMaps.get(uiLocation.source.sourceMap.url)) === null || _a === void 0 ? void 0 : _a.map;
        if (!map)
            return [];
        const sourceMapUiLocation = this._sourceMappedUiLocation(uiLocation, map);
        if (!isUiLocation(sourceMapUiLocation))
            return [];
        const r = this.getSourceMapUiLocations(sourceMapUiLocation);
        r.push(sourceMapUiLocation);
        return r;
    }
    _sourceMappedUiLocation(uiLocation, map) {
        const compiled = uiLocation.source;
        if (!exports.isSourceWithMap(compiled)) {
            return UnmappedReason.HasNoMap;
        }
        if (this._temporarilyDisabledSourceMaps.has(compiled) ||
            this._permanentlyDisabledSourceMaps.has(compiled)) {
            return UnmappedReason.MapDisabled;
        }
        const entry = this.getOptiminalOriginalPosition(map, rawToUiOffset(uiLocation, compiled.inlineScriptOffset));
        if ('isSourceMapLoadFailure' in entry) {
            return UnmappedReason.MapLoadingFailed;
        }
        if (!entry.source) {
            return UnmappedReason.MapPositionMissing;
        }
        const source = compiled.sourceMap.sourceByUrl.get(entry.source);
        if (!source) {
            return UnmappedReason.MapPositionMissing;
        }
        return {
            lineNumber: entry.line || 1,
            columnNumber: entry.column ? entry.column + 1 : 1,
            source: source,
        };
    }
    getCompiledLocations(uiLocation) {
        if (!(uiLocation.source instanceof SourceFromMap)) {
            return [];
        }
        let output = [];
        for (const [compiled, sourceUrl] of uiLocation.source.compiledToSourceUrl) {
            const sourceMap = this._sourceMaps.get(compiled.sourceMap.url);
            if (!sourceMap || !sourceMap.map) {
                continue;
            }
            const entry = this.sourceMapFactory.guardSourceMapFn(sourceMap.map, 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            () => sourceUtils.getOptimalCompiledPosition(sourceUrl, uiLocation, sourceMap.map), getFallbackPosition);
            if (!entry) {
                continue;
            }
            const { lineNumber, columnNumber } = uiToRawOffset({
                lineNumber: entry.line || 1,
                columnNumber: (entry.column || 0) + 1,
            }, compiled.inlineScriptOffset);
            const compiledUiLocation = {
                lineNumber,
                columnNumber,
                source: compiled,
            };
            output = output.concat(compiledUiLocation, this.getCompiledLocations(compiledUiLocation));
        }
        return output;
    }
    /**
     * Gets the best original position for the location in the source map.
     */
    getOptiminalOriginalPosition(sourceMap, uiLocation) {
        return this.sourceMapFactory.guardSourceMapFn(sourceMap, () => {
            const glb = sourceMap.originalPositionFor({
                line: uiLocation.lineNumber,
                column: uiLocation.columnNumber - 1,
                bias: source_map_1.SourceMapConsumer.GREATEST_LOWER_BOUND,
            });
            if (glb.line !== null) {
                return glb;
            }
            return sourceMap.originalPositionFor({
                line: uiLocation.lineNumber,
                column: uiLocation.columnNumber - 1,
                bias: source_map_1.SourceMapConsumer.LEAST_UPPER_BOUND,
            });
        }, getFallbackPosition);
    }
    /**
     * Adds a new source to the collection.
     */
    async addSource(url, contentGetter, sourceMapUrl, inlineSourceRange, runtimeScriptOffset, contentHash) {
        const absolutePath = await this.sourcePathResolver.urlToAbsolutePath({ url });
        this.logger.verbose("runtime.sourcecreate" /* RuntimeSourceCreate */, 'Creating source from url', {
            inputUrl: url,
            absolutePath,
        });
        const source = new Source(this, url, absolutePath, contentGetter, sourceMapUrl &&
            this.sourcePathResolver.shouldResolveSourceMap({
                sourceMapUrl,
                compiledPath: absolutePath || url,
            })
            ? sourceMapUrl
            : undefined, inlineSourceRange, runtimeScriptOffset, this.launchConfig.enableContentValidation ? contentHash : undefined);
        this._addSource(source);
        return source;
    }
    async _addSource(source) {
        const existingByUrl = source.url && this._sourceByOriginalUrl.get(source.url);
        if (existingByUrl && !isOriginalSourceOf(existingByUrl, source)) {
            this.removeSource(existingByUrl, true);
        }
        this._sourceByOriginalUrl.set(source.url, source);
        this._sourceByReference.set(source.sourceReference, source);
        if (source instanceof SourceFromMap) {
            this._sourceMapSourcesByUrl.set(source.url, source);
        }
        // Some builds, like the Vue starter, generate 'metadata' files for compiled
        // files with query strings appended to deduplicate them, or nested inside
        // of internal prefixes. If we see a duplicate entries for an absolute path,
        // take the shorter of them.
        const existingByPath = this._sourceByAbsolutePath.get(source.absolutePath);
        if (existingByPath === undefined ||
            existingByPath.url.length >= source.url.length ||
            isOriginalSourceOf(existingByPath, source)) {
            this._sourceByAbsolutePath.set(source.absolutePath, source);
        }
        this.scriptSkipper.initializeSkippingValueForSource(source);
        source.toDap().then(dap => this._dap.loadedSource({ reason: 'new', source: dap }));
        if (!exports.isSourceWithMap(source)) {
            return;
        }
        const existingSourceMap = this._sourceMaps.get(source.sourceMap.url);
        if (existingSourceMap) {
            existingSourceMap.compiled.add(source);
            if (existingSourceMap.map) {
                // If source map has been already loaded, we add sources here.
                // Otheriwse, we'll add sources for all compiled after loading the map.
                await this._addSourceMapSources(source, existingSourceMap.map);
            }
            return;
        }
        const deferred = promiseUtil_1.getDeferred();
        const sourceMap = { compiled: new Set([source]), loaded: deferred.promise };
        this._sourceMaps.set(source.sourceMap.url, sourceMap);
        try {
            sourceMap.map = await this.sourceMapFactory.load(source.sourceMap.metadata);
        }
        catch (urlError) {
            if (this.initializeConfig.clientID === 'visualstudio') {
                // On VS we want to support loading source-maps from storage if the web-server doesn't serve them
                const originalSourceMapUrl = source.sourceMap.metadata.sourceMapUrl;
                try {
                    const sourceMapAbsolutePath = await this.sourcePathResolver.urlToAbsolutePath({
                        url: originalSourceMapUrl,
                    });
                    if (sourceMapAbsolutePath) {
                        source.sourceMap.metadata.sourceMapUrl = utils.absolutePathToFileUrl(sourceMapAbsolutePath);
                    }
                    sourceMap.map = await this.sourceMapFactory.load(source.sourceMap.metadata);
                    this._statistics.fallbackSourceMapCount++;
                    this.logger.info("sourcemap.parsing" /* SourceMapParsing */, `Failed to process original source-map; falling back to storage source-map`, {
                        fallbackSourceMapUrl: source.sourceMap.metadata.sourceMapUrl,
                        originalSourceMapUrl,
                        originalSourceMapError: dapTelemetryReporter_1.extractErrorDetails(urlError),
                    });
                }
                catch (_a) { }
            }
            if (!sourceMap.map) {
                this._dap.output({
                    output: errors_1.sourceMapParseFailed(source.url, urlError.message).error.format + '\n',
                    category: 'stderr',
                });
                return deferred.resolve();
            }
        }
        // Source map could have been detached while loading.
        if (this._sourceMaps.get(source.sourceMap.url) !== sourceMap) {
            return deferred.resolve();
        }
        this.logger.verbose("sourcemap.parsing" /* SourceMapParsing */, 'Creating sources from source map', {
            sourceMapId: sourceMap.map.id,
            metadata: sourceMap.map.metadata,
        });
        const todo = [];
        for (const compiled of sourceMap.compiled) {
            todo.push(this._addSourceMapSources(compiled, sourceMap.map));
        }
        await Promise.all(todo);
        // re-initialize after loading source mapped sources
        this.scriptSkipper.initializeSkippingValueForSource(source);
        deferred.resolve();
    }
    removeSource(source, silent = false) {
        const existing = this._sourceByReference.get(source.sourceReference);
        if (existing === undefined) {
            return; // already removed
        }
        this.logger.assert(source === existing, 'Expected source to be the same as the existing reference');
        this._sourceByReference.delete(source.sourceReference);
        if (source instanceof SourceFromMap) {
            this._sourceMapSourcesByUrl.delete(source.url);
        }
        this._sourceByAbsolutePath.delete(source.absolutePath);
        if (exports.isSourceWithMap(source)) {
            this._permanentlyDisabledSourceMaps.delete(source);
            this._temporarilyDisabledSourceMaps.delete(source);
        }
        if (!silent) {
            source.toDap().then(dap => this._dap.loadedSource({ reason: 'removed', source: dap }));
        }
        if (!exports.isSourceWithMap(source))
            return;
        const sourceMap = this._sourceMaps.get(source.sourceMap.url);
        if (!this.logger.assert(sourceMap, `Source map missing for ${source.sourceMap.url} in removeSource()`)) {
            return;
        }
        this.logger.assert(sourceMap.compiled.has(source), `Source map ${source.sourceMap.url} does not contain source ${source.url}`);
        sourceMap.compiled.delete(source);
        if (!sourceMap.compiled.size) {
            if (sourceMap.map)
                sourceMap.map.destroy();
            this._sourceMaps.delete(source.sourceMap.url);
        }
        // Source map could still be loading, or failed to load.
        if (sourceMap.map) {
            this._removeSourceMapSources(source, sourceMap.map, silent);
        }
    }
    async _addSourceMapSources(compiled, map) {
        const todo = [];
        for (const url of map.sources) {
            const absolutePath = await this.sourcePathResolver.urlToAbsolutePath({ url, map });
            const resolvedUrl = absolutePath
                ? utils.absolutePathToFileUrl(absolutePath)
                : map.computedSourceUrl(url);
            const existing = this._sourceMapSourcesByUrl.get(resolvedUrl);
            if (existing) {
                existing.compiledToSourceUrl.set(compiled, url);
                compiled.sourceMap.sourceByUrl.set(url, existing);
                continue;
            }
            this.logger.verbose("runtime.sourcecreate" /* RuntimeSourceCreate */, 'Creating source from source map', {
                inputUrl: url,
                sourceMapId: map.id,
                absolutePath,
                resolvedUrl,
            });
            // Note: we can support recursive source maps here if we parse sourceMapUrl comment.
            const fileUrl = absolutePath && utils.absolutePathToFileUrl(absolutePath);
            const content = this.sourceMapFactory.guardSourceMapFn(map, () => map.sourceContentFor(url), () => null);
            const source = new SourceFromMap(this, resolvedUrl, absolutePath, content !== null
                ? () => Promise.resolve(content)
                : fileUrl
                    ? () => this.resourceProvider.fetch(fileUrl).then(r => r.body)
                    : () => compiled.content(), undefined, undefined, compiled.runtimeScriptOffset);
            source.compiledToSourceUrl.set(compiled, url);
            compiled.sourceMap.sourceByUrl.set(url, source);
            todo.push(this._addSource(source));
        }
        await Promise.all(todo);
    }
    _removeSourceMapSources(compiled, map, silent) {
        for (const url of map.sources) {
            const source = compiled.sourceMap.sourceByUrl.get(url);
            if (!this.logger.assert(source, `Unknown source ${url} in removeSourceMapSources`)) {
                continue;
            }
            compiled.sourceMap.sourceByUrl.delete(url);
            source.compiledToSourceUrl.delete(compiled);
            if (source.compiledToSourceUrl.size)
                continue;
            this.removeSource(source, silent);
        }
    }
    // Waits for source map to be loaded (if any), and sources to be created from it.
    async waitForSourceMapSources(source) {
        if (!exports.isSourceWithMap(source)) {
            return [];
        }
        const sourceMap = this._sourceMaps.get(source.sourceMap.url);
        if (!this.logger.assert(sourceMap, 'Unrecognized source map url in waitForSourceMapSources()')) {
            return [];
        }
        await sourceMap.loaded;
        return [...source.sourceMap.sourceByUrl.values()];
    }
    /**
     * Opens the UI location within the connected editor.
     */
    async revealUiLocation(uiLocation) {
        this._dap.revealLocationRequested({
            source: await uiLocation.source.toDap(),
            line: uiLocation.lineNumber,
            column: uiLocation.columnNumber,
        });
    }
    /**
     * Disables the source map for the given source, either only until we
     * stop debugging within the file, or permanently.
     */
    disableSourceMapForSource(source, permanent = false) {
        if (permanent) {
            this._permanentlyDisabledSourceMaps.add(source);
        }
        else {
            this._temporarilyDisabledSourceMaps.add(source);
        }
    }
    /**
     * Clears temporarily disables maps for the sources.
     */
    clearDisabledSourceMaps(forSource) {
        if (forSource) {
            this._temporarilyDisabledSourceMaps.delete(forSource);
        }
        else {
            this._temporarilyDisabledSourceMaps.clear();
        }
    }
};
SourceContainer = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.IDapApi)),
    __param(1, inversify_1.inject(sourceMapFactory_1.ISourceMapFactory)),
    __param(2, inversify_1.inject(logging_1.ILogger)),
    __param(3, inversify_1.inject(configuration_1.AnyLaunchConfiguration)),
    __param(4, inversify_1.inject(ioc_extras_1.IInitializeParams)),
    __param(5, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(6, inversify_1.inject(scriptSkipper_1.IScriptSkipper)),
    __param(7, inversify_1.inject(resourceProvider_1.IResourceProvider))
], SourceContainer);
exports.SourceContainer = SourceContainer;
function uiToRawOffset(lc, offset) {
    if (!offset) {
        return lc;
    }
    let { lineNumber, columnNumber } = lc;
    if (offset) {
        lineNumber += offset.lineOffset;
        if (lineNumber <= 1)
            columnNumber += offset.columnOffset;
    }
    return Object.assign(Object.assign({}, lc), { lineNumber, columnNumber });
}
exports.uiToRawOffset = uiToRawOffset;
function rawToUiOffset(lc, offset) {
    if (!offset) {
        return lc;
    }
    let { lineNumber, columnNumber } = lc;
    if (offset) {
        lineNumber = Math.max(1, lineNumber - offset.lineOffset);
        if (lineNumber <= 1)
            columnNumber = Math.max(1, columnNumber - offset.columnOffset);
    }
    return Object.assign(Object.assign({}, lc), { lineNumber, columnNumber });
}
exports.rawToUiOffset = rawToUiOffset;
exports.base0To1 = (lc) => ({
    lineNumber: lc.lineNumber + 1,
    columnNumber: lc.columnNumber + 1,
});
exports.base1To0 = (lc) => ({
    lineNumber: lc.lineNumber - 1,
    columnNumber: lc.columnNumber - 1,
});
//# sourceMappingURL=sources.js.map
//# sourceMappingURL=sources.js.map
