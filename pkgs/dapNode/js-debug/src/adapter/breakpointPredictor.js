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
exports.BreakpointsPredictor = exports.BreakpointPredictorDelegate = exports.IBreakpointsPredictor = void 0;
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const events_1 = require("../common/events");
const fileGlobList_1 = require("../common/fileGlobList");
const logging_1 = require("../common/logging");
const mtimeCorrelatedCache_1 = require("../common/sourceMaps/mtimeCorrelatedCache");
const sourceMapFactory_1 = require("../common/sourceMaps/sourceMapFactory");
const sourceMapRepository_1 = require("../common/sourceMaps/sourceMapRepository");
const sourcePathResolver_1 = require("../common/sourcePathResolver");
const sourceUtils_1 = require("../common/sourceUtils");
const urlUtils = __importStar(require("../common/urlUtils"));
const configuration_1 = require("../configuration");
const performance_1 = require("../telemetry/performance");
const longPredictionWarning = 10 * 1000;
exports.IBreakpointsPredictor = Symbol('IBreakpointsPredictor');
/**
 * Wrapper around a breakpoint predictor which allows its implementation to
 * be replaced. This is used to implement a heuristic used when dealing with
 * hot-reloading tools like Nodemon or Nest.js development: when a child
 * session terminates, the next child of the parent session will
 * rerun prediction.
 */
class BreakpointPredictorDelegate {
    constructor(sourceMapFactory, factory, implementation = factory(), parent) {
        this.sourceMapFactory = sourceMapFactory;
        this.factory = factory;
        this.implementation = implementation;
        this.parent = parent;
        if (implementation instanceof BreakpointPredictorDelegate) {
            this.implementation = implementation.implementation;
        }
        this.childImplementation = this.implementation;
    }
    /**
     * @inheritdoc
     */
    get onLongParse() {
        return this.implementation.onLongParse;
    }
    /**
     * Invalidates the internal predictor, such that the next child will get
     * a new instance of the breakpoint predictor. This is used to deal with
     * hot-reloading scripts like Nodemon.
     */
    invalidateNextChild() {
        if (this.sourceMapFactory instanceof sourceMapFactory_1.CachingSourceMapFactory) {
            this.sourceMapFactory.invalidateCache();
        }
        this.childImplementation = this.factory();
    }
    /**
     * Gets a breakpoint predictor for the child.
     */
    getChild() {
        return new BreakpointPredictorDelegate(this.sourceMapFactory, this.factory, this.childImplementation, this);
    }
    /**
     * @inheritdoc
     */
    getPredictionForSource(sourceFile) {
        return this.implementation.getPredictionForSource(sourceFile);
    }
    /**
     * @inheritdoc
     */
    prepareToPredict() {
        return this.implementation.prepareToPredict();
    }
    /**
     * @inheritdoc
     */
    predictBreakpoints(params) {
        return this.implementation.predictBreakpoints(params);
    }
    /**
     * @inheritdoc
     */
    predictedResolvedLocations(location) {
        return this.implementation.predictedResolvedLocations(location);
    }
    /**
     * @inheritdoc
     */
    dispose() {
        var _a;
        (_a = this.parent) === null || _a === void 0 ? void 0 : _a.invalidateNextChild();
    }
}
exports.BreakpointPredictorDelegate = BreakpointPredictorDelegate;
let BreakpointsPredictor = class BreakpointsPredictor {
    constructor(launchConfig, outFiles, repo, logger, sourceMapFactory, sourcePathResolver) {
        this.outFiles = outFiles;
        this.repo = repo;
        this.logger = logger;
        this.sourceMapFactory = sourceMapFactory;
        this.sourcePathResolver = sourcePathResolver;
        this.predictedLocations = new Map();
        this.longParseEmitter = new events_1.EventEmitter();
        /**
         * Event that fires if it takes a long time to predict sourcemaps.
         */
        this.onLongParse = this.longParseEmitter.event;
        if (launchConfig.__workspaceCachePath) {
            this.cache = new mtimeCorrelatedCache_1.CorrelatedCache(path.join(launchConfig.__workspaceCachePath, 'bp-predict.json'));
        }
    }
    async createInitialMapping() {
        return performance_1.logPerf(this.logger, `BreakpointsPredictor.createInitialMapping`, () => this.createInitialMappingInner());
    }
    async createInitialMappingInner() {
        if (this.outFiles.empty) {
            return new Map();
        }
        const sourcePathToCompiled = urlUtils.caseNormalizedMap();
        const addDiscovery = (discovery) => {
            let set = sourcePathToCompiled.get(discovery.resolvedPath);
            if (!set) {
                set = new Set();
                sourcePathToCompiled.set(discovery.resolvedPath, set);
            }
            set.add(discovery);
        };
        const warnLongRuntime = setTimeout(() => {
            this.longParseEmitter.fire();
            this.logger.warn("runtime.sourcemap" /* RuntimeSourceMap */, 'Long breakpoint predictor runtime', {
                type: this.repo.constructor.name,
                longPredictionWarning,
                patterns: this.outFiles.patterns,
            });
        }, longPredictionWarning);
        try {
            await this.repo.streamChildrenWithSourcemaps(this.outFiles, async (metadata) => {
                var _a, _b;
                const cached = await ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.lookup(metadata.compiledPath, metadata.mtime));
                if (cached) {
                    cached.forEach(c => addDiscovery(Object.assign(Object.assign({}, c), metadata)));
                    return;
                }
                let map;
                try {
                    map = await this.sourceMapFactory.load(metadata);
                }
                catch (_c) {
                    return;
                }
                const discovered = [];
                for (const url of map.sources) {
                    const resolvedPath = this.sourcePathResolver
                        ? await this.sourcePathResolver.urlToAbsolutePath({ url, map })
                        : urlUtils.fileUrlToAbsolutePath(url);
                    if (!resolvedPath) {
                        continue;
                    }
                    const discovery = Object.assign(Object.assign({}, metadata), { resolvedPath, sourceUrl: url });
                    discovered.push(discovery);
                    addDiscovery(discovery);
                }
                (_b = this.cache) === null || _b === void 0 ? void 0 : _b.store(metadata.compiledPath, metadata.mtime, discovered.map(d => ({ resolvedPath: d.resolvedPath, sourceUrl: d.sourceUrl })));
            });
        }
        catch (error) {
            this.logger.warn("runtime.exception" /* RuntimeException */, 'Error reading sourcemaps from disk', { error });
        }
        clearTimeout(warnLongRuntime);
        return sourcePathToCompiled;
    }
    /**
     * @inheritdoc
     */
    async prepareToPredict() {
        if (!this.sourcePathToCompiled) {
            this.sourcePathToCompiled = this.createInitialMapping();
        }
        await this.sourcePathToCompiled;
    }
    /**
     * Returns a promise that resolves when breakpoints for the given location
     * are predicted.
     */
    async predictBreakpoints(params) {
        var _a, _b;
        if (!params.source.path || !((_a = params.breakpoints) === null || _a === void 0 ? void 0 : _a.length)) {
            return;
        }
        if (!this.sourcePathToCompiled) {
            this.sourcePathToCompiled = this.createInitialMapping();
        }
        const set = (await this.sourcePathToCompiled).get(params.source.path);
        if (!set) {
            return;
        }
        const sourceMaps = await Promise.all([...set].map(metadata => this.sourceMapFactory
            .load(metadata)
            .then(map => ({ map, metadata }))
            .catch(() => undefined)));
        for (const b of (_b = params.breakpoints) !== null && _b !== void 0 ? _b : []) {
            const key = `${params.source.path}:${b.line}:${b.column || 1}`;
            if (this.predictedLocations.has(key)) {
                return;
            }
            const locations = [];
            this.predictedLocations.set(key, locations);
            for (const sourceMapLoad of sourceMaps) {
                if (!sourceMapLoad) {
                    continue;
                }
                const { map, metadata } = sourceMapLoad;
                const entry = this.sourceMapFactory.guardSourceMapFn(map, () => sourceUtils_1.getOptimalCompiledPosition(metadata.sourceUrl, {
                    lineNumber: b.line,
                    columnNumber: b.column || 1,
                }, map), () => null);
                if (!entry || entry.line === null) {
                    continue;
                }
                locations.push({
                    absolutePath: metadata.compiledPath,
                    lineNumber: entry.line || 1,
                    columnNumber: entry.column ? entry.column + 1 : 1,
                });
            }
        }
    }
    /**
     * @inheritdoc
     */
    async getPredictionForSource(sourcePath) {
        if (!this.sourcePathToCompiled) {
            this.sourcePathToCompiled = this.createInitialMapping();
        }
        return (await this.sourcePathToCompiled).get(sourcePath);
    }
    /**
     * Returns predicted breakpoint locations for the provided source.
     */
    predictedResolvedLocations(location) {
        var _a;
        const key = `${location.absolutePath}:${location.lineNumber}:${location.columnNumber || 1}`;
        return (_a = this.predictedLocations.get(key)) !== null && _a !== void 0 ? _a : [];
    }
};
BreakpointsPredictor = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(configuration_1.AnyLaunchConfiguration)),
    __param(1, inversify_1.inject(fileGlobList_1.OutFiles)),
    __param(2, inversify_1.inject(sourceMapRepository_1.ISearchStrategy)),
    __param(3, inversify_1.inject(logging_1.ILogger)),
    __param(4, inversify_1.inject(sourceMapFactory_1.ISourceMapFactory)),
    __param(5, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver))
], BreakpointsPredictor);
exports.BreakpointsPredictor = BreakpointsPredictor;
//# sourceMappingURL=breakpointPredictor.js.map
//# sourceMappingURL=breakpointPredictor.js.map
