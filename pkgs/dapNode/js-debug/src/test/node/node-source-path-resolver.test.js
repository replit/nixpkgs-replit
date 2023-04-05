"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs_1 = require("fs");
const path_1 = require("path");
const fsUtils_1 = require("../../common/fsUtils");
const logger_1 = require("../../common/logging/logger");
const urlUtils_1 = require("../../common/urlUtils");
const nodeSourcePathResolver_1 = require("../../targets/node/nodeSourcePathResolver");
const fsUtils = new fsUtils_1.LocalFsUtils(fs_1.promises);
describe('node source path resolver', () => {
    describe('url to path', () => {
        const defaultOptions = {
            resolveSourceMapLocations: null,
            basePath: __dirname,
            remoteRoot: null,
            localRoot: null,
            sourceMapOverrides: { 'webpack:///*': `${__dirname}/*` },
        };
        it('resolves absolute', async () => {
            const r = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, defaultOptions, await logger_1.Logger.test());
            chai_1.expect(await r.urlToAbsolutePath({ url: 'file:///src/index.js' })).to.equal(path_1.resolve('/src/index.js'));
        });
        it('normalizes roots (win -> posix) ', async () => {
            const r = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, Object.assign(Object.assign({}, defaultOptions), { remoteRoot: 'C:\\Source', localRoot: '/dev/src' }), await logger_1.Logger.test());
            chai_1.expect(await r.urlToAbsolutePath({ url: 'file:///c:/source/foo/bar.js' })).to.equal('/dev/src/foo/bar.js');
        });
        it('normalizes roots (posix -> win) ', async () => {
            const r = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, Object.assign(Object.assign({}, defaultOptions), { remoteRoot: '/dev/src', localRoot: 'C:\\Source' }), await logger_1.Logger.test());
            chai_1.expect(await r.urlToAbsolutePath({ url: 'file:///dev/src/foo/bar.js' })).to.equal('c:\\Source\\foo\\bar.js');
        });
        it('places relative paths in node_internals', async () => {
            const r = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, defaultOptions, await logger_1.Logger.test());
            chai_1.expect(await r.urlToAbsolutePath({
                url: 'internal.js',
            })).to.equal('<node_internals>/internal.js');
        });
        it('applies source map overrides', async () => {
            const r = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, defaultOptions, await logger_1.Logger.test());
            chai_1.expect(await r.urlToAbsolutePath({
                url: 'webpack:///hello.js',
                map: { sourceRoot: '', metadata: { compiledPath: 'hello.js' } },
            })).to.equal(path_1.join(__dirname, 'hello.js'));
        });
        it('loads local node internals (#823)', async () => {
            const r = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, defaultOptions, logger_1.Logger.null);
            chai_1.expect(await r.urlToAbsolutePath({ url: 'node:url' })).to.equal(path_1.join(__dirname, 'lib/url.js'));
            chai_1.expect(await r.urlToAbsolutePath({ url: 'node:internal/url.js' })).to.equal(path_1.join(__dirname, 'lib/internal/url.js'));
        });
        describe('source map filtering', () => {
            const testTable = {
                'matches paths': {
                    locs: ['/foo/bar/**', '!**/node_modules/**'],
                    map: 'file:///foo/bar/baz/my.map.js',
                    ok: true,
                },
                'is case sensitive on unix': {
                    locs: ['/foo/BAR/**', '!**/node_modules/**'],
                    map: 'file:////bar/my.map.js',
                    ok: false,
                    caseSensitive: true,
                },
                'does not match paths outside of locations': {
                    locs: ['/foo/bar/**', '!**/node_modules/**'],
                    map: 'file:////bar/my.map.js',
                    ok: false,
                },
                'applies negations': {
                    locs: ['/foo/bar/**', '!**/node_modules/**'],
                    map: 'file:///foo/bar/node_modules/my.map.js',
                    ok: false,
                },
                'matches win32 paths, case insensitive': {
                    locs: ['c:\\foo\\BAR\\**', '!**\\node_modules\\**'],
                    map: 'file:///c:/foo/bar/BAZ/my.map.js',
                    ok: true,
                    caseSensitive: false,
                },
                'applies win32 negations': {
                    locs: ['c:\\foo\\bar\\**', '!**\\node_modules\\**'],
                    map: 'file:///c:/foo/bar/node_modules/my.map.js',
                    ok: false,
                },
                'works for http urls, case insensitive': {
                    locs: ['https://EXAMPLE.com/**'],
                    map: 'https://example.COM/my.map.js',
                    ok: true,
                },
            };
            afterEach(() => urlUtils_1.resetCaseSensitivePaths());
            for (const key of Object.keys(testTable)) {
                const tcase = testTable[key];
                const { locs, map, ok } = tcase;
                const caseSensitive = 'caseSensitive' in tcase && tcase.caseSensitive;
                it(key, async () => {
                    urlUtils_1.setCaseSensitivePaths(caseSensitive);
                    const resolver = new nodeSourcePathResolver_1.NodeSourcePathResolver(fsUtils, undefined, Object.assign(Object.assign({}, defaultOptions), { resolveSourceMapLocations: locs }), await logger_1.Logger.test());
                    const result = await resolver.urlToAbsolutePath({
                        url: 'webpack:///hello.js',
                        map: { metadata: { sourceMapUrl: map, compiledPath: map }, sourceRoot: '' },
                    });
                    if (ok) {
                        chai_1.expect(result).to.equal(path_1.join(__dirname, 'hello.js'));
                    }
                    else {
                        chai_1.expect(result).to.be.undefined;
                    }
                });
            }
        });
    });
});
//# sourceMappingURL=node-source-path-resolver.test.js.map
//# sourceMappingURL=node-source-path-resolver.test.js.map
