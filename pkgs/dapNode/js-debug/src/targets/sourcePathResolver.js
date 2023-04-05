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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourcePathResolverBase = void 0;
const micromatch_1 = __importDefault(require("micromatch"));
const path = __importStar(require("path"));
const node15Internal_1 = require("../common/node15Internal");
const pathUtils_1 = require("../common/pathUtils");
const urlUtils_1 = require("../common/urlUtils");
const sourceMapOverrides_1 = require("./sourceMapOverrides");
class SourcePathResolverBase {
    constructor(options, logger) {
        var _a;
        this.options = options;
        this.logger = logger;
        this.sourceMapOverrides = new sourceMapOverrides_1.SourceMapOverrides(this.options.sourceMapOverrides, this.logger);
        /**
         * Source map resolve locations. Processed to resolve any relative segments
         * of the path, to make `${workspaceFolder}/../foo` and the like work, since
         * micromatch doesn't have native awareness of them.
         */
        this.resolveLocations = (_a = this.options.resolveSourceMapLocations) === null || _a === void 0 ? void 0 : _a.map(location => {
            location = location.replace(/\.[a-z0-9]+$/, '.*');
            const prefix = location.startsWith('!') ? '!' : '';
            const remaining = location.slice(prefix.length);
            if (urlUtils_1.isAbsolute(remaining)) {
                return prefix + pathUtils_1.properResolve(remaining);
            }
            return location;
        });
    }
    /**
     * @inheritdoc
     */
    absolutePathToUrlRegexp(absolutePath) {
        const url = this.absolutePathToUrl(absolutePath);
        return Promise.resolve(url ? urlUtils_1.urlToRegex(url) : undefined);
    }
    /**
     * Returns whether the source map should be used to resolve a local path,
     * following the `resolveSourceMapPaths`
     */
    shouldResolveSourceMap({ sourceMapUrl, compiledPath }) {
        // Node 15 started including some source-mapped internals (acorn), but
        // they don't ship source maps in the build. Never try to resolve those.
        if (compiledPath.startsWith(node15Internal_1.node15InternalsPrefix)) {
            return false;
        }
        if (!this.resolveLocations || this.resolveLocations.length === 0) {
            return true;
        }
        const sourcePath = 
        // If the source map refers to an absolute path, that's what we're after
        urlUtils_1.fileUrlToAbsolutePath(sourceMapUrl) ||
            // If it's a data URI, use the compiled path as a stand-in. It should
            // be quite rare that ignored files (i.e. node_modules) reference
            // source modules and vise versa.
            (urlUtils_1.isDataUri(sourceMapUrl) && compiledPath) ||
            // Fall back to the raw URL if those fail.
            sourceMapUrl;
        // Where the compiled path is webpack-internal, just resolve it. We have
        // no way to know where it's coming from, but this is necessary sometimes.
        // See https://github.com/microsoft/vscode-js-debug/issues/854#issuecomment-741958453
        if (sourcePath.startsWith('webpack-internal:///')) {
            return true;
        }
        // Be case insensitive for things that might be remote uris--we have no way
        // to know whether the server is case sensitive or not.
        const caseSensitive = /^[a-z]+:/i.test(sourceMapUrl) ? false : urlUtils_1.getCaseSensitivePaths();
        const processMatchInput = (value) => {
            value = pathUtils_1.forceForwardSlashes(value);
            // built-in 'nocase' match option applies only to operand; we need to normalize both
            return caseSensitive ? value : value.toLowerCase();
        };
        const l = micromatch_1.default([processMatchInput(sourcePath)], this.resolveLocations.map(processMatchInput), {
            dot: true,
        });
        return l.length > 0;
    }
    /**
     * Rebases a remote path to a local one using the remote and local roots.
     * The path should should given as a filesystem path, not a URI.
     */
    rebaseRemoteToLocal(remotePath) {
        if (!this.options.remoteRoot || !this.options.localRoot || !this.canMapPath(remotePath)) {
            return path.resolve(remotePath);
        }
        const relativePath = pathUtils_1.properRelative(this.options.remoteRoot, remotePath);
        if (relativePath.startsWith('..')) {
            return '';
        }
        let localPath = pathUtils_1.properJoin(this.options.localRoot, relativePath);
        localPath = pathUtils_1.fixDriveLetter(localPath);
        this.logger.verbose("runtime.sourcemap" /* RuntimeSourceMap */, `Mapped remoteToLocal: ${remotePath} -> ${localPath}`);
        return pathUtils_1.properResolve(localPath);
    }
    /**
     * Rebases a local path to a remote one using the remote and local roots.
     * The path should should given as a filesystem path, not a URI.
     */
    rebaseLocalToRemote(localPath) {
        if (!this.options.remoteRoot || !this.options.localRoot || !this.canMapPath(localPath)) {
            return localPath;
        }
        const relPath = pathUtils_1.properRelative(this.options.localRoot, localPath);
        let remotePath = pathUtils_1.properJoin(this.options.remoteRoot, relPath);
        remotePath = pathUtils_1.fixDriveLetterAndSlashes(remotePath, /*uppercaseDriveLetter=*/ true);
        this.logger.verbose("runtime.sourcemap" /* RuntimeSourceMap */, `Mapped localToRemote: ${localPath} -> ${remotePath}`);
        return remotePath;
    }
    canMapPath(candidate) {
        return (path.posix.isAbsolute(candidate) || path.win32.isAbsolute(candidate) || urlUtils_1.isFileUrl(candidate));
    }
}
exports.SourcePathResolverBase = SourcePathResolverBase;
//# sourceMappingURL=sourcePathResolver.js.map
//# sourceMappingURL=sourcePathResolver.js.map
