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
exports.moduleAwarePathMappingResolver = exports.defaultPathMappingResolver = exports.getComputedSourceRoot = exports.getFullSourceEntry = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const url_1 = require("url");
const utils = __importStar(require("../../common/urlUtils"));
const objUtils_1 = require("../objUtils");
const pathUtils_1 = require("../pathUtils");
function getFullSourceEntry(sourceRoot, sourcePath) {
    if (!sourceRoot) {
        return sourcePath;
    }
    if (!sourceRoot.endsWith('/')) {
        sourceRoot += '/';
    }
    return sourceRoot + sourcePath;
}
exports.getFullSourceEntry = getFullSourceEntry;
/**
 * Gets the best source root out of the set of path mappings.
 */
async function getComputedSourceRoot(sourceRoot, generatedPath, pathMapping, resolver, logger) {
    generatedPath = utils.fileUrlToAbsolutePath(generatedPath) || generatedPath;
    let absSourceRoot;
    if (sourceRoot) {
        if (utils.isFileUrl(sourceRoot)) {
            // sourceRoot points to a local path like "file:///c:/project/src", make it an absolute path
            absSourceRoot = utils.fileUrlToAbsolutePath(sourceRoot);
        }
        else if (utils.isAbsolute(sourceRoot)) {
            // sourceRoot is like "/src", should be like http://localhost/src, resolve to a local path using pathMaping.
            // If path mappings do not apply (e.g. node), assume that sourceRoot is actually a local absolute path.
            // Technically not valid but it's easy to end up with paths like this.
            absSourceRoot = (await resolver(sourceRoot, pathMapping, logger)) || sourceRoot;
            // If no pathMapping (node), use sourceRoot as is.
            // But we also should handle an absolute sourceRoot for chrome? Does CDT handle that? No it does not, it interprets it as "localhost/full path here"
        }
        else if (path.isAbsolute(generatedPath)) {
            // sourceRoot is like "src" or "../src", relative to the script
            absSourceRoot = resolveRelativeToFile(generatedPath, sourceRoot);
        }
        else {
            // generatedPath is a URL so runtime script is not on disk, resolve the sourceRoot location on disk.
            const generatedUrlPath = new url_1.URL(generatedPath).pathname;
            const mappedPath = await resolver(generatedUrlPath, pathMapping, logger);
            const mappedDirname = path.dirname(mappedPath);
            absSourceRoot = pathUtils_1.properJoin(mappedDirname, sourceRoot);
        }
        logger.verbose("sourcemap.parsing" /* SourceMapParsing */, `resolved sourceRoot`, { sourceRoot, absSourceRoot });
    }
    else if (path.isAbsolute(generatedPath)) {
        absSourceRoot = path.dirname(generatedPath);
        logger.verbose("sourcemap.parsing" /* SourceMapParsing */, `no sourceRoot specified, using script dirname`, {
            absSourceRoot,
        });
    }
    else {
        // No sourceRoot and runtime script is not on disk, resolve the sourceRoot location on disk
        const urlPathname = new url_1.URL(generatedPath).pathname || '/placeholder.js'; // could be debugadapter://123, no other info.
        const mappedPath = await resolver(urlPathname, pathMapping, logger);
        const scriptPathDirname = mappedPath ? path.dirname(mappedPath) : '';
        absSourceRoot = scriptPathDirname;
        logger.verbose("sourcemap.parsing" /* SourceMapParsing */, `no sourceRoot specified, using webRoot + script path dirname`, { absSourceRoot });
    }
    absSourceRoot = utils.stripTrailingSlash(absSourceRoot);
    absSourceRoot = pathUtils_1.fixDriveLetterAndSlashes(absSourceRoot);
    return absSourceRoot;
}
exports.getComputedSourceRoot = getComputedSourceRoot;
/**
 * Default path mapping resolver. Applies the mapping by running a key
 * check in memory.
 */
exports.defaultPathMappingResolver = async (scriptUrlPath, pathMapping, logger) => {
    if (!scriptUrlPath || !scriptUrlPath.startsWith('/')) {
        return '';
    }
    const mappingKeys = Object.keys(pathMapping).sort((a, b) => b.length - a.length);
    for (let pattern of mappingKeys) {
        // empty pattern match nothing use / to match root
        if (!pattern) {
            continue;
        }
        const mappingRHS = pathMapping[pattern];
        if (pattern[0] !== '/') {
            logger.verbose("sourcemap.parsing" /* SourceMapParsing */, `Keys should be absolute: ${pattern}`);
            pattern = '/' + pattern;
        }
        if (pathMappingPatternMatchesPath(pattern, scriptUrlPath)) {
            return toClientPath(pattern, mappingRHS, scriptUrlPath);
        }
    }
    return '';
};
/**
 * A path mapping resolver that resolves to the nearest folder containing
 * a package.json if there's no more precise match in the mapping.
 */
exports.moduleAwarePathMappingResolver = (fsUtils, compiledPath) => async (sourceRoot, pathMapping, logger) => {
    // 1. Handle cases where we know the path is already absolute on disk.
    if (process.platform === 'win32' && /^[a-z]:/i.test(sourceRoot)) {
        return sourceRoot;
    }
    // 2. It's a unix-style path. Get the root of this package containing the compiled file.
    const implicit = await utils.nearestDirectoryContaining(fsUtils, path.dirname(compiledPath), 'package.json');
    // 3. If there's no specific root, try to use the base path mappings
    if (!implicit) {
        return exports.defaultPathMappingResolver(sourceRoot, pathMapping, logger);
    }
    // 4. If we can find a root, only use path mapping from within the package
    const explicit = await exports.defaultPathMappingResolver(sourceRoot, 
    // filter the mapping to directories that could be
    objUtils_1.filterObject(pathMapping, key => key.length >= implicit.length), logger);
    // 5. On *nix, try at this point to see if the original path given is
    // absolute on-disk. We'll say it is if there was no specific path mapping
    // and the sourceRoot points to a subdirectory that exists.
    if (process.platform !== 'win32' && sourceRoot !== '/' && !explicit) {
        const possibleStat = await fs_1.promises.stat(sourceRoot).catch(() => undefined);
        if (possibleStat === null || possibleStat === void 0 ? void 0 : possibleStat.isDirectory()) {
            return sourceRoot;
        }
    }
    // 6. If we got a path mapping within the package, use that. Otherise use
    // the package root as the sourceRoot.
    return explicit || implicit;
};
function pathMappingPatternMatchesPath(pattern, scriptPath) {
    if (pattern === scriptPath) {
        return true;
    }
    if (!pattern.endsWith('/')) {
        // Don't match /foo with /foobar/something
        pattern += '/';
    }
    return scriptPath.startsWith(pattern);
}
function toClientPath(pattern, mappingRHS, scriptPath) {
    const rest = decodeURIComponent(scriptPath.substring(pattern.length));
    const mappedResult = rest ? pathUtils_1.properJoin(mappingRHS, rest) : mappingRHS;
    return mappedResult;
}
/**
 * Resolves a relative path in terms of another file
 */
function resolveRelativeToFile(absPath, relPath) {
    return pathUtils_1.properResolve(path.dirname(absPath), relPath);
}
//# sourceMappingURL=sourceMapResolutionUtils.js.map
//# sourceMappingURL=sourceMapResolutionUtils.js.map
