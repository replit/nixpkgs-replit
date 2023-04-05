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
exports.testVueMapper = void 0;
const chai_1 = require("chai");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const sinon_1 = require("sinon");
const vueFileMapper_1 = require("../../adapter/vueFileMapper");
const fileGlobList_1 = require("../../common/fileGlobList");
const fsUtils_1 = require("../../common/fsUtils");
const logger_1 = require("../../common/logging/logger");
const configuration_1 = require("../../configuration");
const browserPathResolver_1 = require("../../targets/browser/browserPathResolver");
const test_1 = require("../test");
exports.testVueMapper = {
    lookup: async (url) => path.join(test_1.testFixturesDir, 'web', 'looked up', url),
    getVueHandling: url => url.includes('lookup.vue')
        ? 1 /* Lookup */
        : url.includes('omit.vue')
            ? 2 /* Omit */
            : 0 /* Unhandled */,
};
describe('browserPathResolver.urlToAbsolutePath', () => {
    let fsExistStub;
    before(() => {
        fsExistStub = sinon_1.stub(fsUtils_1.fsModule, 'exists').callsFake((path, cb) => {
            switch (path) {
                case 'c:\\Users\\user\\Source\\Repos\\Angular Project\\ClientApp\\src\\app\\app.component.html':
                    return cb(true);
                case 'c:\\Users\\user\\Source\\Repos\\Angular Project\\wwwroot\\src\\app\\app.component.html':
                    return cb(false);
                default:
                    throw Error(`Unknown path ${path}`);
            }
        });
    });
    describe('vue', () => {
        const resolver = new browserPathResolver_1.BrowserSourcePathResolver(exports.testVueMapper, new fsUtils_1.LocalFsUtils(fs_1.promises), {
            pathMapping: { '/': path.join(test_1.testFixturesDir, 'web') },
            clientID: 'vscode',
            baseUrl: 'http://localhost:1234/',
            sourceMapOverrides: configuration_1.defaultSourceMapPathOverrides(path.join(test_1.testFixturesDir, 'web')),
            localRoot: null,
            remoteRoot: null,
            resolveSourceMapLocations: null,
            remoteFilePrefix: undefined,
        }, logger_1.Logger.null);
        const fakeMap = {
            metadata: {
                compiledPath: path.join(test_1.testFixturesDir, 'web', 'bundle.js'),
                sourceMapUrl: path.join(test_1.testFixturesDir, 'web', 'bundle.map.js'),
            },
        };
        it('looks up vue paths', async () => {
            chai_1.expect(await resolver.urlToAbsolutePath({
                url: 'lookup.vue',
                map: fakeMap,
            })).to.equal(path.join(test_1.testFixturesDir, 'web', 'looked up', 'lookup.vue'));
        });
        it('omits vue paths', async () => {
            chai_1.expect(await resolver.urlToAbsolutePath({
                url: 'omit.vue',
                map: fakeMap,
            })).to.be.undefined;
        });
        it('uses default handling', async () => {
            chai_1.expect(await resolver.urlToAbsolutePath({
                url: 'whatever.vue',
                map: fakeMap,
            })).to.equal(path.join(test_1.testFixturesDir, 'web', 'whatever.vue'));
        });
        describe('VueFileMapper', () => {
            const mapper = new vueFileMapper_1.VueFileMapper(new fileGlobList_1.FileGlobList({ rootPath: test_1.testFixturesDir, patterns: ['**/*.vue'] }), {
                streamChildrenWithSourcemaps() {
                    return Promise.resolve([]);
                },
                streamAllChildren(_files, onChild) {
                    return Promise.all([
                        onChild(path.join(test_1.testFixturesDir, 'web', 'a.vue')),
                        onChild(path.join(test_1.testFixturesDir, 'web', 'b.vue')),
                    ]);
                },
            });
            it('has correct vue handling', () => {
                const ttable = new Map([
                    ['webpack:///hello.vue?f00d', 1 /* Lookup */],
                    ['webpack:///./components/hello.vue?f00d', 2 /* Omit */],
                    ['webpack:///unrelated.js', 0 /* Unhandled */],
                ]);
                for (const [sourceUrl, expected] of ttable.entries()) {
                    chai_1.expect(mapper.getVueHandling(sourceUrl)).to.equal(expected);
                }
            });
            it('maps basenames to disk', async () => {
                chai_1.expect(await mapper.lookup('webpack:///a.vue?f00d')).to.equal(path.join(test_1.testFixturesDir, 'web', 'a.vue'));
                chai_1.expect(await mapper.lookup('webpack:///q.vue?f00d')).to.be.undefined;
                chai_1.expect(await mapper.lookup('webpack:///unrelated.js')).to.be.undefined;
            });
        });
    });
    class FakeLocalFsUtils {
        exists(path) {
            switch (path) {
                case 'c:\\Users\\user\\Source\\Repos\\Angular Project\\ClientApp\\src\\app\\app.component.html':
                    return Promise.resolve(true);
                case 'c:\\Users\\user\\Source\\Repos\\Angular Project\\wwwroot\\src\\app\\app.component.html':
                    return Promise.resolve(false);
                default:
                    throw Error(`Unknown path ${path}`);
            }
        }
    }
    describe('absolutePathToUrl', () => {
        const resolver = new browserPathResolver_1.BrowserSourcePathResolver(exports.testVueMapper, new fsUtils_1.LocalFsUtils(fs_1.promises), {
            pathMapping: {
                '/': path.join(test_1.testFixturesDir, 'web'),
                '/sibling': path.join(test_1.testFixturesDir, 'sibling-dir'),
            },
            clientID: 'vscode',
            baseUrl: 'http://localhost:1234/',
            sourceMapOverrides: configuration_1.defaultSourceMapPathOverrides(path.join(test_1.testFixturesDir, 'web')),
            localRoot: null,
            remoteRoot: null,
            resolveSourceMapLocations: null,
            remoteFilePrefix: undefined,
        }, logger_1.Logger.null);
        it('selects webRoot correctly', () => {
            chai_1.expect(resolver.absolutePathToUrl(path.join(test_1.testFixturesDir, 'web', 'foo', 'bar.html'))).to.equal('http://localhost:1234/foo/bar.html');
            chai_1.expect(resolver.absolutePathToUrl(path.join(test_1.testFixturesDir, 'sibling-dir', 'foo', 'bar.html'))).to.equal('http://localhost:1234/sibling/foo/bar.html');
        });
        it('falls back if not in any webroot', () => {
            chai_1.expect(resolver.absolutePathToUrl(path.join(test_1.testFixturesDir, 'foo', 'bar.html'))).to.equal('http://localhost:1234/../foo/bar.html');
        });
    });
    [
        ['visualstudio', 'ClientApp'],
        ['vscode', 'wwwroot'],
    ].forEach(([client, folder]) => {
        it(`returns ${folder} for ${client} if the webroot path doesn't exist and the modified path does`, async () => {
            const webRoot = 'c:\\Users\\user\\Source\\Repos\\Angular Project\\wwwroot';
            const resolver = new browserPathResolver_1.BrowserSourcePathResolver(exports.testVueMapper, new FakeLocalFsUtils(), {
                pathMapping: { '/': webRoot },
                clientID: client,
                baseUrl: 'http://localhost:60318/',
                sourceMapOverrides: configuration_1.defaultSourceMapPathOverrides(webRoot),
                localRoot: null,
                remoteRoot: null,
                resolveSourceMapLocations: null,
                remoteFilePrefix: undefined,
            }, await logger_1.Logger.test());
            const url = 'webpack:///src/app/app.component.html';
            const absolutePath = await resolver.urlToAbsolutePath({
                url,
                map: { metadata: { sourceRoot: '', compiledPath: '' } },
            });
            chai_1.expect(absolutePath).to.equal(`c:\\Users\\user\\Source\\Repos\\Angular Project\\${folder}\\src\\app\\app.component.html`);
        });
    });
    after(() => {
        fsExistStub.restore();
    });
});
//# sourceMappingURL=browserPathResolverTest.js.map
//# sourceMappingURL=browserPathResolverTest.js.map
