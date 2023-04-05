"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceMap = void 0;
const urlUtils_1 = require("../urlUtils");
const pathUtils_1 = require("../pathUtils");
/**
 * Wrapper for a parsed sourcemap.
 */
class SourceMap {
    constructor(original, metadata, actualRoot, actualSources) {
        this.original = original;
        this.metadata = metadata;
        this.actualRoot = actualRoot;
        this.actualSources = actualSources;
        /**
         * Map of aliased source names to the names in the `original` map.
         */
        this.sourceActualToOriginal = new Map();
        this.sourceOriginalToActual = new Map();
        /**
         * Unique source map ID, used for cross-referencing.
         */
        this.id = SourceMap.idCounter++;
        if (actualSources.length !== original.sources.length) {
            throw new Error(`Expected actualSources.length === original.source.length`);
        }
        for (let i = 0; i < actualSources.length; i++) {
            this.sourceActualToOriginal.set(actualSources[i], original.sources[i]);
            this.sourceOriginalToActual.set(original.sources[i], actualSources[i]);
        }
    }
    /**
     * Gets the source filenames of the sourcemap. We preserve them out-of-bounds
     * since the source-map library does normalization that destroys certain
     * path segments.
     *
     * @see https://github.com/microsoft/vscode-js-debug/issues/479#issuecomment-634221103
     */
    get sources() {
        return this.actualSources.slice();
    }
    /**
     * Gets the optional name of the generated code that this source map is associated with
     */
    get file() {
        var _a;
        return (_a = this.metadata.compiledPath) !== null && _a !== void 0 ? _a : this.original.file;
    }
    /**
     * Gets the source root of the sourcemap.
     */
    get sourceRoot() {
        // see SourceMapFactory.loadSourceMap for what's happening here
        return this.actualRoot;
    }
    /**
     * Gets the sources content.
     */
    get sourcesContent() {
        return this.original.sourcesContent;
    }
    /**
     * Gets the source URL computed from the compiled path and the source root.
     */
    computedSourceUrl(sourceUrl) {
        return pathUtils_1.fixDriveLetterAndSlashes(urlUtils_1.completeUrlEscapingRoot(this.metadata.sourceMapUrl.startsWith('data:')
            ? this.metadata.compiledPath
            : this.metadata.sourceMapUrl, this.sourceRoot + sourceUrl));
    }
    /**
     * @inheritdoc
     */
    computeColumnSpans() {
        this.original.computeColumnSpans();
    }
    /**
     * @inheritdoc
     */
    originalPositionFor(generatedPosition) {
        var _a;
        const mapped = this.original.originalPositionFor(generatedPosition);
        if (mapped.source) {
            mapped.source = (_a = this.sourceOriginalToActual.get(mapped.source)) !== null && _a !== void 0 ? _a : mapped.source;
        }
        return mapped;
    }
    /**
     * @inheritdoc
     */
    generatedPositionFor(originalPosition) {
        var _a;
        return this.original.generatedPositionFor(Object.assign(Object.assign({}, originalPosition), { source: (_a = this.sourceActualToOriginal.get(originalPosition.source)) !== null && _a !== void 0 ? _a : originalPosition.source }));
    }
    /**
     * @inheritdoc
     */
    allGeneratedPositionsFor(originalPosition) {
        var _a;
        return this.original.allGeneratedPositionsFor(Object.assign(Object.assign({}, originalPosition), { source: (_a = this.sourceActualToOriginal.get(originalPosition.source)) !== null && _a !== void 0 ? _a : originalPosition.source }));
    }
    /**
     * @inheritdoc
     */
    hasContentsOfAllSources() {
        return this.original.hasContentsOfAllSources();
    }
    /**
     * @inheritdoc
     */
    sourceContentFor(source, returnNullOnMissing) {
        var _a;
        return this.original.sourceContentFor((_a = this.sourceActualToOriginal.get(source)) !== null && _a !== void 0 ? _a : source, returnNullOnMissing);
    }
    /**
     * @inheritdoc
     */
    eachMapping(callback, context, order) {
        return this.original.eachMapping(callback, context, order);
    }
    /**
     * @inheritdoc
     */
    destroy() {
        this.original.destroy();
    }
}
exports.SourceMap = SourceMap;
SourceMap.idCounter = 0;
//# sourceMappingURL=sourceMap.js.map
//# sourceMappingURL=sourceMap.js.map
