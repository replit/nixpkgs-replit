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
const chai_1 = require("chai");
const path = __importStar(require("path"));
const logger_1 = require("../../common/logging/logger");
const pathUtils_1 = require("../../common/pathUtils");
const sourceMapResolutionUtils_1 = require("../../common/sourceMaps/sourceMapResolutionUtils");
describe('SourceMapOverrides', () => {
    describe('getComputedSourceRoot()', () => {
        const resolve = (...parts) => pathUtils_1.fixDriveLetter(path.resolve(...parts));
        const genPath = resolve('/project/webroot/code/script.js');
        const GEN_URL = 'http://localhost:8080/code/script.js';
        const ABS_SOURCEROOT = resolve('/project/src');
        const WEBROOT = resolve('/project/webroot');
        const PATH_MAPPING = { '/': WEBROOT };
        it('handles file:/// sourceRoot', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('file:///' + ABS_SOURCEROOT, genPath, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(ABS_SOURCEROOT);
        });
        it('handles /src style sourceRoot', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('/src', genPath, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(resolve('/project/webroot/src'));
        });
        it('handles /src style without matching pathMapping', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('/foo/bar', genPath, {}, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal('/foo/bar');
        });
        it('handles c:/src style without matching pathMapping', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('c:\\foo\\bar', genPath, {}, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal('c:\\foo\\bar');
        });
        it('handles ../../src style sourceRoot', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('../../src', genPath, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(ABS_SOURCEROOT);
        });
        it('handles src style sourceRoot', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('src', genPath, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(resolve('/project/webroot/code/src'));
        });
        it('handles runtime script not on disk', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('../src', GEN_URL, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(resolve('/project/webroot/src'));
        });
        it('when no sourceRoot specified and runtime script is on disk, uses the runtime script dirname', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('', genPath, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(resolve('/project/webroot/code'));
        });
        it('when no sourceRoot specified and runtime script is not on disk, uses the runtime script dirname', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('', GEN_URL, PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(resolve('/project/webroot/code'));
        });
        it('no crash on debugadapter:// urls', async () => {
            chai_1.expect(await sourceMapResolutionUtils_1.getComputedSourceRoot('', 'eval://123', PATH_MAPPING, sourceMapResolutionUtils_1.defaultPathMappingResolver, logger_1.Logger.null)).to.equal(resolve(WEBROOT));
        });
    });
});
//# sourceMappingURL=sourceMapOverrides.test.js.map
//# sourceMappingURL=sourceMapOverrides.test.js.map
