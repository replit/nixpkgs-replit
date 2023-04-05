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
const test_1 = require("../test");
const createFileTree_1 = require("../createFileTree");
const nvmResolver_1 = require("../../targets/node/nvmResolver");
const chai_1 = require("chai");
const path = __importStar(require("path"));
const protocolError_1 = require("../../dap/protocolError");
const fs_1 = require("fs");
const fsUtils_1 = require("../../common/fsUtils");
const fsUtils = new fsUtils_1.LocalFsUtils(fs_1.promises);
describe('runtimeVersion', () => {
    let resolver;
    it('fails if no nvm/s present', async () => {
        resolver = new nvmResolver_1.NvmResolver(fsUtils, {}, 'x64', 'linux');
        await chai_1.expect(resolver.resolveNvmVersionPath('13')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /requires Node.js version manager/);
    });
    describe('fall throughs', () => {
        beforeEach(() => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'nvs/node/13.12.0/x64/bin/node': '',
                'nvs/node/13.11.0/x86/bin/node': '',
                'nvm/versions/node/v13.11.0/bin/node': '',
            });
            resolver = new nvmResolver_1.NvmResolver(fsUtils, { NVS_HOME: path.join(test_1.testFixturesDir, 'nvs'), NVM_DIR: path.join(test_1.testFixturesDir, 'nvm') }, 'x64', 'linux');
        });
        it('attempts multiple lookup to get the right version', async () => {
            const { directory: a } = await resolver.resolveNvmVersionPath('13.12');
            chai_1.expect(a).to.equal(path.join(test_1.testFixturesDir, 'nvs/node/13.12.0/x64/bin'));
            const { directory: b } = await resolver.resolveNvmVersionPath('13.11');
            chai_1.expect(b).to.equal(path.join(test_1.testFixturesDir, 'nvm/versions/node/v13.11.0/bin'));
            await chai_1.expect(resolver.resolveNvmVersionPath('14')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /not installed using version manager nvs\/nvm/);
        });
        it('requires nvs for a specific architecture', async () => {
            resolver = new nvmResolver_1.NvmResolver(fsUtils, { NVM_DIR: path.join(test_1.testFixturesDir, 'nvm') }, 'x64', 'linux');
            await chai_1.expect(resolver.resolveNvmVersionPath('13.11/x64')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /architecture requires 'nvs' to be installed/);
        });
        it('does not fall through if requesting a specific nvs architecture', async () => {
            await chai_1.expect(resolver.resolveNvmVersionPath('13.11/x64')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /not installed/);
        });
    });
    describe('nvs support', () => {
        beforeEach(() => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'node/13.12.0/x64/bin/node': '',
                'node/13.4.0/x86/bin/node': '',
                'node/13.3.0/x64/bin/node': '',
                'node/13.3.1/x64/bin/node64.exe': '',
                'node/13.invalid/x64/bin/node': '',
            });
            resolver = new nvmResolver_1.NvmResolver(fsUtils, { NVS_HOME: test_1.testFixturesDir }, 'x64', 'linux');
        });
        it('gets an exact match', async () => {
            const { directory, binary } = await resolver.resolveNvmVersionPath('13.3.0');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'node/13.3.0/x64/bin'));
            chai_1.expect(binary).to.equal('node');
        });
        it('resolves node64', async () => {
            const { directory, binary } = await resolver.resolveNvmVersionPath('13.3.1');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'node/13.3.1/x64/bin'));
            chai_1.expect(binary).to.equal('node64');
        });
        it('gets the best matching version', async () => {
            const { directory } = await resolver.resolveNvmVersionPath('13');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'node/13.12.0/x64/bin'));
        });
        it('throws if no version match', async () => {
            await chai_1.expect(resolver.resolveNvmVersionPath('14')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /not installed/);
        });
        it('throws on none for specific architecture', async () => {
            await chai_1.expect(resolver.resolveNvmVersionPath('13.4.0')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /not installed/);
        });
        it('gets a specific architecture', async () => {
            const { directory } = await resolver.resolveNvmVersionPath('13/x86');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'node/13.4.0/x86/bin'));
        });
        it('omits the bin directory on windows', async () => {
            resolver = new nvmResolver_1.NvmResolver(fsUtils, { NVS_HOME: test_1.testFixturesDir }, 'x64', 'win32');
            const { directory } = await resolver.resolveNvmVersionPath('13.3.0');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'node/13.3.0/x64'));
        });
    });
    describe('nvm windows', () => {
        beforeEach(() => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'v13.12.0/node.exe': '',
                'v13.3.0/node.exe': '',
                'v13.3.1/node64.exe': '',
                'v13.invalid/node.exe': '',
            });
            resolver = new nvmResolver_1.NvmResolver(fsUtils, { NVM_HOME: test_1.testFixturesDir }, 'x64', 'win32');
        });
        it('gets an exact match', async () => {
            const { directory, binary } = await resolver.resolveNvmVersionPath('13.3.0');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'v13.3.0'));
            chai_1.expect(binary).to.equal('node');
        });
        it('resolves node64', async () => {
            const { directory, binary } = await resolver.resolveNvmVersionPath('13.3.1');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'v13.3.1'));
            chai_1.expect(binary).to.equal('node64');
        });
        it('gets the best matching version', async () => {
            const { directory } = await resolver.resolveNvmVersionPath('13');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'v13.12.0'));
        });
        it('throws if no version match', async () => {
            await chai_1.expect(resolver.resolveNvmVersionPath('14')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /not installed/);
        });
    });
    describe('nvm osx', () => {
        beforeEach(() => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'versions/node/v13.12.0/bin/node': '',
                'versions/node/v13.3.0/bin/node': '',
                'versions/node/v13.3.1/bin/node64': '',
                'versions/node/v13.invalid/bin/node': '',
            });
            resolver = new nvmResolver_1.NvmResolver(fsUtils, { NVM_DIR: test_1.testFixturesDir }, 'x64', 'linux');
        });
        it('gets an exact match', async () => {
            const { directory, binary } = await resolver.resolveNvmVersionPath('13.3.0');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'versions/node/v13.3.0/bin'));
            chai_1.expect(binary).to.equal('node');
        });
        it('resolves node64', async () => {
            const { directory, binary } = await resolver.resolveNvmVersionPath('13.3.1');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'versions/node/v13.3.1/bin'));
            chai_1.expect(binary).to.equal('node64');
        });
        it('gets the best matching version', async () => {
            const { directory } = await resolver.resolveNvmVersionPath('13');
            chai_1.expect(directory).to.equal(path.join(test_1.testFixturesDir, 'versions/node/v13.12.0/bin'));
        });
        it('throws if no version match', async () => {
            await chai_1.expect(resolver.resolveNvmVersionPath('14')).to.eventually.be.rejectedWith(protocolError_1.ProtocolError, /not installed/);
        });
    });
});
//# sourceMappingURL=runtimeVersion.test.js.map
//# sourceMappingURL=runtimeVersion.test.js.map
