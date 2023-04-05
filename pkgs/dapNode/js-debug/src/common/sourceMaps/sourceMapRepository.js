"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetadataForFile = exports.ISearchStrategy = void 0;
const fsUtils_1 = require("../fsUtils");
const sourceUtils_1 = require("../sourceUtils");
const urlUtils_1 = require("../urlUtils");
exports.ISearchStrategy = Symbol('ISearchStrategy');
/**
 * Generates source map metadata from a path on disk and file contents.
 * @param compiledPath -- Absolute path of the .js file on disk
 * @param fileContents -- Read contents of the file
 */
exports.createMetadataForFile = async (compiledPath, fileContents) => {
    if (typeof fileContents === 'undefined') {
        fileContents = await fsUtils_1.readfile(compiledPath);
    }
    let sourceMapUrl = sourceUtils_1.parseSourceMappingUrl(fileContents);
    if (!sourceMapUrl) {
        return;
    }
    sourceMapUrl = urlUtils_1.completeUrl(urlUtils_1.absolutePathToFileUrl(compiledPath), sourceMapUrl);
    if (!sourceMapUrl) {
        return;
    }
    if (!sourceMapUrl.startsWith('data:') && !sourceMapUrl.startsWith('file://')) {
        return;
    }
    const stats = await fsUtils_1.stat(urlUtils_1.fileUrlToAbsolutePath(sourceMapUrl) || compiledPath);
    if (!stats) {
        return;
    }
    return {
        compiledPath,
        sourceMapUrl,
        mtime: stats && stats.mtimeMs,
    };
};
//# sourceMappingURL=sourceMapRepository.js.map
//# sourceMappingURL=sourceMapRepository.js.map
