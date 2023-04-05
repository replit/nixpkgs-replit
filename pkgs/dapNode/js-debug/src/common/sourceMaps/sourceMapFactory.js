"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingSourceMapFactory = exports.SourceMapFactory = exports.ISourceMapFactory = void 0;
const inversify_1 = require("inversify");
const source_map_1 = require("source-map");
const resourceProvider_1 = require("../../adapter/resourceProvider");
const connection_1 = require("../../dap/connection");
const errors_1 = require("../../dap/errors");
const mapUsingProjection_1 = require("../datastructure/mapUsingProjection");
const sourcePathResolver_1 = require("../sourcePathResolver");
const urlUtils_1 = require("../urlUtils");
const sourceMap_1 = require("./sourceMap");
exports.ISourceMapFactory = Symbol('ISourceMapFactory');
/**
 * Base implementation of the ISourceMapFactory.
 */
let SourceMapFactory = class SourceMapFactory {
    constructor(pathResolve, resourceProvider, dap) {
        this.pathResolve = pathResolve;
        this.resourceProvider = resourceProvider;
        this.dap = dap;
        /**
         * A set of sourcemaps that we warned about failing to parse.
         * @see ISourceMapFactory#guardSourceMapFn
         */
        this.hasWarnedAboutMaps = new WeakSet();
    }
    /**
     * @inheritdoc
     */
    async load(metadata) {
        const basic = await this.parseSourceMap(metadata.sourceMapUrl);
        // The source-map library is destructive with its sources parsing. If the
        // source root is '/', it'll "helpfully" resolve a source like `../foo.ts`
        // to `/foo.ts` as if the source map refers to the root of the filesystem.
        // This would prevent us from being able to see that it's actually in
        // a parent directory, so we make the sourceRoot empty but show it here.
        const actualRoot = basic.sourceRoot;
        basic.sourceRoot = undefined;
        // The source map library (also) "helpfully" normalizes source URLs, so
        // preserve them in the same way. Then, rename the sources to prevent any
        // of their names colliding (e.g. "webpack://./index.js" and "webpack://../index.js")
        const actualSources = basic.sources;
        basic.sources = basic.sources.map((_, i) => `source${i}.js`);
        return new sourceMap_1.SourceMap((await new source_map_1.SourceMapConsumer(basic)), metadata, actualRoot !== null && actualRoot !== void 0 ? actualRoot : '', actualSources);
    }
    /**
     * @inheritdoc
     */
    guardSourceMapFn(sourceMap, fn, defaultValue) {
        try {
            return fn();
        }
        catch (e) {
            if (!/error parsing/i.test(String(e.message))) {
                throw e;
            }
            if (!this.hasWarnedAboutMaps.has(sourceMap)) {
                const message = errors_1.sourceMapParseFailed(sourceMap.metadata.compiledPath, e.message).error;
                this.dap.output({
                    output: message.format + '\n',
                    category: 'stderr',
                });
                this.hasWarnedAboutMaps.add(sourceMap);
            }
            return defaultValue();
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        // no-op
    }
    async parseSourceMap(sourceMapUrl) {
        let absolutePath = urlUtils_1.fileUrlToAbsolutePath(sourceMapUrl);
        if (absolutePath) {
            absolutePath = this.pathResolve.rebaseRemoteToLocal(absolutePath);
        }
        const content = await this.resourceProvider.fetch(absolutePath || sourceMapUrl);
        if (!content.ok) {
            throw content.error;
        }
        let body = content.body;
        if (body.slice(0, 3) === ')]}') {
            body = body.substring(body.indexOf('\n'));
        }
        return JSON.parse(body);
    }
};
SourceMapFactory = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(1, inversify_1.inject(resourceProvider_1.IResourceProvider)),
    __param(2, inversify_1.inject(connection_1.IRootDapApi))
], SourceMapFactory);
exports.SourceMapFactory = SourceMapFactory;
/**
 * A cache of source maps shared between the Thread and Predictor to avoid
 * duplicate loading.
 */
let CachingSourceMapFactory = class CachingSourceMapFactory extends SourceMapFactory {
    constructor() {
        super(...arguments);
        this.knownMaps = new mapUsingProjection_1.MapUsingProjection(s => s.toLowerCase());
        /**
         * Sourcemaps who have been overwritten by newly loaded maps. We can't
         * destroy these since sessions might still references them. Once finalizers
         * are available this can be removed.
         */
        this.overwrittenSourceMaps = [];
    }
    /**
     * @inheritdoc
     */
    load(metadata) {
        const existing = this.knownMaps.get(metadata.sourceMapUrl);
        if (!existing) {
            return this.loadNewSourceMap(metadata);
        }
        const curTime = metadata.mtime;
        const prevTime = existing.metadata.mtime;
        // If asked to reload, do so if either map is missing a mtime, or they aren't the same
        if (existing.reloadIfNoMtime) {
            if (!(curTime && prevTime && curTime === prevTime)) {
                this.overwrittenSourceMaps.push(existing.prom);
                return this.loadNewSourceMap(metadata);
            }
            else {
                existing.reloadIfNoMtime = false;
                return existing.prom;
            }
        }
        // Otherwise, only reload if times are present and the map definitely changed.
        if (prevTime && curTime && curTime !== prevTime) {
            this.overwrittenSourceMaps.push(existing.prom);
            return this.loadNewSourceMap(metadata);
        }
        return existing.prom;
    }
    loadNewSourceMap(metadata) {
        const created = super.load(metadata);
        this.knownMaps.set(metadata.sourceMapUrl, { metadata, reloadIfNoMtime: false, prom: created });
        return created;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        for (const map of this.knownMaps.values()) {
            map.prom.then(m => m.destroy(), () => undefined);
        }
        for (const map of this.overwrittenSourceMaps) {
            map.then(m => m.destroy(), () => undefined);
        }
        this.knownMaps.clear();
    }
    /**
     * Invalidates all source maps that *don't* have associated mtimes, so that
     * they're reloaded the next time they're requested.
     */
    invalidateCache() {
        for (const map of this.knownMaps.values()) {
            map.reloadIfNoMtime = true;
        }
    }
};
CachingSourceMapFactory = __decorate([
    inversify_1.injectable()
], CachingSourceMapFactory);
exports.CachingSourceMapFactory = CachingSourceMapFactory;
//# sourceMappingURL=sourceMapFactory.js.map
//# sourceMappingURL=sourceMapFactory.js.map
