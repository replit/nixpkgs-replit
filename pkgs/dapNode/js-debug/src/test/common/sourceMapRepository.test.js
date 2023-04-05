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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path_1 = require("path");
const test_1 = require("../test");
const createFileTree_1 = require("../createFileTree");
const urlUtils_1 = require("../../common/urlUtils");
const vscode = __importStar(require("vscode"));
const pathUtils_1 = require("../../common/pathUtils");
const nodeSearchStrategy_1 = require("../../common/sourceMaps/nodeSearchStrategy");
const codeSearchStrategy_1 = require("../../common/sourceMaps/codeSearchStrategy");
const logger_1 = require("../../common/logging/logger");
const fileGlobList_1 = require("../../common/fileGlobList");
describe('ISourceMapRepository', () => {
    [
        { name: 'NodeSourceMapRepository', create: () => new nodeSearchStrategy_1.NodeSearchStrategy(logger_1.Logger.null) },
        {
            name: 'CodeSearchSourceMapRepository',
            create: () => new codeSearchStrategy_1.CodeSearchStrategy(vscode, logger_1.Logger.null),
        },
    ].forEach(tcase => describe(tcase.name, () => {
        let r;
        beforeEach(() => {
            r = tcase.create();
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'a.js': '//# sourceMappingURL=a.js.map',
                'a.js.map': 'content1',
                'c.js': 'no.sourcemap.here',
                nested: {
                    'd.js': '//# sourceMappingURL=d.js.map',
                    'd.js.map': 'content2',
                },
                node_modules: {
                    'e.js': '//# sourceMappingURL=e.js.map',
                    'e.js.map': 'content3',
                },
                defaultSearchExcluded: {
                    'f.js': '//# sourceMappingURL=f.js.map',
                    'f.js.map': 'content3',
                },
            });
        });
        const gatherFileList = (rootPath, firstIncludeSegment) => new fileGlobList_1.FileGlobList({
            rootPath,
            patterns: [`${firstIncludeSegment}/**/*.js`, '!**/node_modules/**'],
        });
        const gatherSm = (rootPath, firstIncludeSegment) => {
            return r
                .streamChildrenWithSourcemaps(gatherFileList(rootPath, firstIncludeSegment), async (m) => {
                const { mtime } = m, rest = __rest(m, ["mtime"]);
                chai_1.expect(mtime).to.be.within(Date.now() - 60 * 1000, Date.now() + 1000);
                rest.compiledPath = pathUtils_1.fixDriveLetter(rest.compiledPath);
                return rest;
            })
                .then(r => r.sort((a, b) => a.compiledPath.length - b.compiledPath.length));
        };
        const gatherAll = (rootPath, firstIncludeSegment) => {
            return r
                .streamAllChildren(gatherFileList(rootPath, firstIncludeSegment), m => m)
                .then(r => r.sort());
        };
        it('no-ops for non-existent directories', async () => {
            chai_1.expect(await gatherSm(__dirname, 'does-not-exist')).to.be.empty;
        });
        it('discovers source maps and applies negated globs', async () => {
            chai_1.expect(await gatherSm(test_1.workspaceFolder, test_1.testFixturesDirName)).to.deep.equal([
                {
                    compiledPath: pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'a.js')),
                    sourceMapUrl: urlUtils_1.absolutePathToFileUrl(path_1.join(test_1.testFixturesDir, 'a.js.map')),
                },
                {
                    compiledPath: pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'nested', 'd.js')),
                    sourceMapUrl: urlUtils_1.absolutePathToFileUrl(path_1.join(test_1.testFixturesDir, 'nested', 'd.js.map')),
                },
                {
                    compiledPath: pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'defaultSearchExcluded', 'f.js')),
                    sourceMapUrl: urlUtils_1.absolutePathToFileUrl(path_1.join(test_1.testFixturesDir, 'defaultSearchExcluded', 'f.js.map')),
                },
            ]);
        });
        it('streams all children', async () => {
            chai_1.expect(await gatherAll(test_1.workspaceFolder, test_1.testFixturesDirName)).to.deep.equal([
                pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'a.js')),
                pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'c.js')),
                pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'defaultSearchExcluded', 'f.js')),
                pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'nested', 'd.js')),
            ]);
        });
        // todo: better absolute pathing support
        if (tcase.name !== 'CodeSearchSourceMapRepository') {
            it('greps inside node_modules explicitly', async () => {
                chai_1.expect(await gatherSm(path_1.join(test_1.testFixturesDir, 'node_modules'), '.')).to.deep.equal([
                    {
                        compiledPath: pathUtils_1.fixDriveLetter(path_1.join(test_1.testFixturesDir, 'node_modules', 'e.js')),
                        sourceMapUrl: urlUtils_1.absolutePathToFileUrl(path_1.join(test_1.testFixturesDir, 'node_modules', 'e.js.map')),
                    },
                ]);
            });
        }
    }));
});
//# sourceMappingURL=sourceMapRepository.test.js.map
//# sourceMappingURL=sourceMapRepository.test.js.map
