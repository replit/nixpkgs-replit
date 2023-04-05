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
exports.BrowserSourcePathResolver = void 0;
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const url_1 = require("url");
const vueFileMapper_1 = require("../../adapter/vueFileMapper");
const fsUtils_1 = require("../../common/fsUtils");
const pathUtils_1 = require("../../common/pathUtils");
const sourceMapResolutionUtils_1 = require("../../common/sourceMaps/sourceMapResolutionUtils");
const utils = __importStar(require("../../common/urlUtils"));
const urlUtils_1 = require("../../common/urlUtils");
const sourcePathResolver_1 = require("../sourcePathResolver");
let BrowserSourcePathResolver = class BrowserSourcePathResolver extends sourcePathResolver_1.SourcePathResolverBase {
    constructor(vueMapper, fsUtils, options, logger) {
        super(options, logger);
        this.vueMapper = vueMapper;
        this.fsUtils = fsUtils;
    }
    absolutePathToUrl(absolutePath) {
        absolutePath = path.normalize(absolutePath);
        const { baseUrl, pathMapping } = this.options;
        if (!baseUrl) {
            return utils.absolutePathToFileUrl(absolutePath);
        }
        const defaultMapping = ['/', pathMapping['/']];
        const bestMatch = Object.entries(pathMapping)
            .sort(([, directoryA], [, directoryB]) => directoryB.length - directoryA.length)
            .find(([, directory]) => pathUtils_1.isSubdirectoryOf(directory, absolutePath)) || defaultMapping;
        if (!bestMatch) {
            return utils.absolutePathToFileUrl(absolutePath);
        }
        let urlPath = utils.platformPathToUrlPath(path.relative(bestMatch[1], absolutePath));
        const urlPrefix = bestMatch[0].replace(/\/$|^\//g, '');
        if (urlPrefix) {
            urlPath = urlPrefix + '/' + urlPath;
        }
        return utils.completeUrlEscapingRoot(baseUrl, urlPath);
    }
    async urlToAbsolutePath({ url, map }) {
        const queryCharacter = url.indexOf('?');
        // Workaround for vue, see https://github.com/microsoft/vscode-js-debug/issues/239
        if (queryCharacter !== -1 && url.slice(queryCharacter - 4, queryCharacter) !== '.vue') {
            url = url.slice(0, queryCharacter);
        }
        return map ? this.sourceMapSourceToAbsolute(url, map) : this.simpleUrlToAbsolute(url);
    }
    async simpleUrlToAbsolute(url) {
        // Simple eval'd code will never have a valid path
        if (!url) {
            return;
        }
        // If we have a file URL, we know it's absolute already and points
        // to a location on disk.
        if (utils.isFileUrl(url)) {
            const abs = utils.fileUrlToAbsolutePath(url);
            if (await this.fsUtils.exists(abs)) {
                return abs;
            }
            const net = utils.fileUrlToNetworkPath(url);
            if (await this.fsUtils.exists(net)) {
                return net;
            }
        }
        let pathname;
        try {
            const parsed = new url_1.URL(url);
            if (!parsed.pathname || parsed.pathname === '/') {
                pathname = 'index.html';
            }
            else {
                pathname = parsed.pathname;
            }
            if (parsed.protocol === 'webpack-internal:') {
                return undefined;
            }
        }
        catch (_a) {
            pathname = url;
        }
        const extname = path.extname(pathname);
        const pathParts = pathname
            .replace(/^\//, '') // Strip leading /
            .split(/[\/\\]/);
        while (pathParts.length > 0) {
            const joinedPath = '/' + pathParts.join('/');
            const clientPath = await sourceMapResolutionUtils_1.defaultPathMappingResolver(joinedPath, this.options.pathMapping, this.logger);
            if (clientPath) {
                if (!extname && (await this.fsUtils.exists(clientPath + ".html" /* Html */))) {
                    return clientPath + ".html" /* Html */;
                }
                if (await this.fsUtils.exists(clientPath)) {
                    return clientPath;
                }
            }
            pathParts.shift();
        }
    }
    async sourceMapSourceToAbsolute(url, map) {
        if (!this.shouldResolveSourceMap(map.metadata)) {
            return undefined;
        }
        switch (this.vueMapper.getVueHandling(url)) {
            case 2 /* Omit */:
                return undefined;
            case 1 /* Lookup */:
                const vuePath = await this.vueMapper.lookup(url);
                if (vuePath) {
                    return pathUtils_1.fixDriveLetterAndSlashes(vuePath);
                }
                break;
            default:
            // fall through
        }
        const { pathMapping } = this.options;
        const fullSourceEntry = sourceMapResolutionUtils_1.getFullSourceEntry(map.sourceRoot, url);
        let mappedFullSourceEntry = this.sourceMapOverrides.apply(fullSourceEntry);
        if (mappedFullSourceEntry !== fullSourceEntry) {
            mappedFullSourceEntry = pathUtils_1.fixDriveLetterAndSlashes(mappedFullSourceEntry);
            // Prefixing ../ClientApp is a workaround for a bug in ASP.NET debugging in VisualStudio because the wwwroot is not properly configured
            const clientAppPath = pathUtils_1.properResolve(pathMapping['/'], '..', 'ClientApp', pathUtils_1.properRelative(pathMapping['/'], mappedFullSourceEntry));
            if (this.options.clientID === 'visualstudio' &&
                fullSourceEntry.startsWith('webpack:///') &&
                !(await this.fsUtils.exists(mappedFullSourceEntry)) &&
                (await this.fsUtils.exists(clientAppPath))) {
                return clientAppPath;
            }
            else {
                return mappedFullSourceEntry;
            }
        }
        if (utils.isFileUrl(url)) {
            return utils.fileUrlToAbsolutePath(url);
        }
        if (!path.isAbsolute(url)) {
            return pathUtils_1.properResolve(await sourceMapResolutionUtils_1.getComputedSourceRoot(map.sourceRoot, map.metadata.compiledPath, pathMapping, sourceMapResolutionUtils_1.defaultPathMappingResolver, this.logger), url);
        }
        return pathUtils_1.fixDriveLetterAndSlashes(url);
    }
    /**
     * @override
     */
    absolutePathToUrlRegexp(absolutePath) {
        let url = this.absolutePathToUrl(absolutePath);
        if (!url) {
            return Promise.resolve(undefined);
        }
        let endRegexEscape = absolutePath.length;
        if (url.endsWith("index.html" /* Index */)) {
            endRegexEscape = url.length - "index.html" /* Index */.length - 1;
            url = url.slice(0, endRegexEscape) + `\\/?($|index(\\.html)?)`;
        }
        else if (url.endsWith(".html" /* Html */)) {
            endRegexEscape = url.length - ".html" /* Html */.length;
            url = url.slice(0, endRegexEscape) + `(\\.html)?`;
        }
        return Promise.resolve(urlUtils_1.urlToRegex(url, [0, endRegexEscape]));
    }
};
BrowserSourcePathResolver = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(vueFileMapper_1.IVueFileMapper)),
    __param(1, inversify_1.inject(fsUtils_1.IFsUtils))
], BrowserSourcePathResolver);
exports.BrowserSourcePathResolver = BrowserSourcePathResolver;
//# sourceMappingURL=browserPathResolver.js.map
//# sourceMappingURL=browserPathResolver.js.map
