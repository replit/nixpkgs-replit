"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs_1 = require("fs");
const path_1 = require("path");
const sinon_1 = require("sinon");
const environmentVars_1 = require("../../common/environmentVars");
const logger_1 = require("../../common/logging/logger");
const semver_1 = require("../../common/semver");
const protocolError_1 = require("../../dap/protocolError");
const nodeBinaryProvider_1 = require("../../targets/node/nodeBinaryProvider");
const test_1 = require("../../test/test");
describe('NodeBinaryProvider', function () {
    this.timeout(30 * 1000); // windows lookups in CI seem to be very slow sometimes
    let p;
    const env = (name) => environmentVars_1.EnvironmentVars.empty.addToPath(path_1.join(test_1.testWorkspace, 'nodePathProvider', name));
    const binaryLocation = (name, binary = 'node') => path_1.join(test_1.testWorkspace, 'nodePathProvider', name, process.platform === 'win32' ? `${binary}.exe` : binary);
    let packageJson;
    beforeEach(() => {
        packageJson = {
            getPath: () => Promise.resolve(undefined),
            getContents: () => Promise.resolve(undefined),
        };
        p = new nodeBinaryProvider_1.NodeBinaryProvider(logger_1.Logger.null, fs_1.promises, packageJson);
    });
    it('rejects not found', async () => {
        try {
            await p.resolveAndValidate(env('not-found'), 'node');
            throw new Error('expected to throw');
        }
        catch (err) {
            chai_1.expect(err).to.be.an.instanceOf(protocolError_1.ProtocolError);
            chai_1.expect(err.cause.id).to.equal(9229 /* CannotFindNodeBinary */);
        }
    });
    it('rejects outdated', async () => {
        try {
            await p.resolveAndValidate(env('outdated'), 'node');
            throw new Error('expected to throw');
        }
        catch (err) {
            chai_1.expect(err).to.be.an.instanceOf(protocolError_1.ProtocolError);
            chai_1.expect(err.cause.id).to.equal(9230 /* NodeBinaryOutOfDate */);
        }
    });
    it('resolves absolute paths', async () => {
        const binary = await p.resolveAndValidate(environmentVars_1.EnvironmentVars.empty, binaryLocation('up-to-date'));
        chai_1.expect(binary.path).to.equal(binaryLocation('up-to-date'));
        chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(12, 0, 0));
        chai_1.expect(binary.isPreciselyKnown).to.be.true;
        chai_1.expect(binary.has(0 /* UseSpacesInRequirePath */)).to.be.true;
    });
    if (process.platform === 'win32') {
        it('resolves absolute paths with extension on windows', async () => {
            const binary = await p.resolveAndValidate(new environmentVars_1.EnvironmentVars(process.env).addToPath(path_1.join(test_1.testWorkspace, 'nodePathProvider', 'no-node')), 'babel');
            chai_1.expect(binary.path).to.equal(path_1.join(test_1.testWorkspace, 'nodePathProvider', 'no-node', 'babel.cmd'));
        });
    }
    it('works if up to date', async () => {
        const binary = await p.resolveAndValidate(env('up-to-date'));
        chai_1.expect(binary.path).to.equal(binaryLocation('up-to-date'));
        // hit the cached path:
        chai_1.expect(await p.resolveAndValidate(env('up-to-date'))).to.equal(binary);
    });
    it('resolves the binary if given a package manager', async () => {
        const binary = await p.resolveAndValidate(env('up-to-date'), 'npm');
        chai_1.expect(binary.path).to.equal(binaryLocation('up-to-date', 'npm'));
    });
    it('still throws outdated through a package manager', async () => {
        try {
            await p.resolveAndValidate(env('outdated'), 'npm');
            throw new Error('expected to throw');
        }
        catch (err) {
            chai_1.expect(err).to.be.an.instanceOf(protocolError_1.ProtocolError);
            chai_1.expect(err.cause.id).to.equal(9230 /* NodeBinaryOutOfDate */);
        }
    });
    it('surpresses not found if a package manager exists', async () => {
        const binary = await p.resolveAndValidate(env('no-node'), 'npm');
        chai_1.expect(binary.path).to.equal(binaryLocation('no-node', 'npm'));
        chai_1.expect(binary.isPreciselyKnown).to.be.false;
        chai_1.expect(binary.version).to.be.undefined;
    });
    it('allows overriding with an explicit version', async () => {
        const binary = await p.resolveAndValidate(env('outdated'), undefined, 11);
        chai_1.expect(binary.path).to.equal(binaryLocation('outdated'));
        chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(11, 0, 0));
        chai_1.expect(binary.has(0 /* UseSpacesInRequirePath */)).to.be.false;
    });
    it('finds node from node_modules when available', async () => {
        packageJson.getPath = () => Promise.resolve(path_1.join(test_1.testWorkspace, 'nodePathProvider', 'node-module', 'package.json'));
        const binary = await p.resolveAndValidate(env('outdated'), 'npm');
        chai_1.expect(binary.path).to.equal(binaryLocation('outdated', 'npm'));
        chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(12, 0, 0));
        chai_1.expect(binary.isPreciselyKnown).to.be.true;
        chai_1.expect(binary.has(0 /* UseSpacesInRequirePath */)).to.be.true;
    });
    describe('electron versioning', () => {
        let getVersionText;
        let resolveBinaryLocation;
        beforeEach(() => {
            getVersionText = sinon_1.stub(p, 'getVersionText');
            resolveBinaryLocation = sinon_1.stub(p, 'resolveBinaryLocation');
            resolveBinaryLocation.withArgs('node').returns('/node');
        });
        it('remaps to node version on electron with .cmd', async () => {
            getVersionText.withArgs('/foo/electron.cmd').resolves('\nv6.1.2\n');
            getVersionText.withArgs('/node').resolves('v14.5.0');
            resolveBinaryLocation.withArgs('electron').returns('/foo/electron.cmd');
            const binary = await p.resolveAndValidate(environmentVars_1.EnvironmentVars.empty, 'electron');
            chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(12, 0, 0));
        });
        it('remaps to node version on electron with no ext', async () => {
            getVersionText.withArgs('/foo/electron').resolves('\nv6.1.2\n');
            getVersionText.withArgs('/node').resolves('v14.5.0');
            resolveBinaryLocation.withArgs('electron').returns('/foo/electron');
            const binary = await p.resolveAndValidate(environmentVars_1.EnvironmentVars.empty, 'electron');
            chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(12, 0, 0));
        });
        it('remaps electron 5', async () => {
            getVersionText.withArgs('/foo/electron').resolves('\nv5.1.2\n');
            getVersionText.withArgs('/node').resolves('v14.5.0');
            resolveBinaryLocation.withArgs('electron').returns('/foo/electron');
            const binary = await p.resolveAndValidate(environmentVars_1.EnvironmentVars.empty, 'electron');
            chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(10, 0, 0));
        });
        it('uses minimum node version', async () => {
            getVersionText.withArgs('/foo/electron').resolves('\nv9.0.0\n');
            getVersionText.withArgs('/node').resolves('v10.0.0');
            resolveBinaryLocation.withArgs('electron').returns('/foo/electron');
            const binary = await p.resolveAndValidate(environmentVars_1.EnvironmentVars.empty, 'electron');
            chai_1.expect(binary.version).to.deep.equal(new semver_1.Semver(10, 0, 0));
        });
        it('assumes snap binaries are good', async () => {
            resolveBinaryLocation.withArgs('node').returns('/snap/bin/node');
            const binary = await p.resolveAndValidate(environmentVars_1.EnvironmentVars.empty);
            chai_1.expect(binary.path).to.equal('/snap/bin/node');
            chai_1.expect(binary.version).to.be.undefined;
            chai_1.expect(getVersionText.called).to.be.false;
        });
    });
});
describe('NodeBinary', () => {
    const matrix = [
        {
            v: '10.0.0',
            c: { [1 /* UseInspectPublishUid */]: false, [0 /* UseSpacesInRequirePath */]: false },
        },
        {
            v: '12.0.0',
            c: { [1 /* UseInspectPublishUid */]: false, [0 /* UseSpacesInRequirePath */]: true },
        },
        {
            v: '12.8.0',
            c: { [1 /* UseInspectPublishUid */]: true, [0 /* UseSpacesInRequirePath */]: true },
        },
    ];
    for (const { v, c } of matrix) {
        it(`capabilities for ${v}`, () => {
            const b = new nodeBinaryProvider_1.NodeBinary('node', semver_1.Semver.parse(v));
            for (const [capability, expected] of Object.entries(c)) {
                chai_1.expect(b.has(Number(capability))).to.equal(expected, capability);
            }
        });
    }
    it('deals with imprecise capabilities', () => {
        const b1 = new nodeBinaryProvider_1.NodeBinary('', undefined);
        chai_1.expect(b1.has(0 /* UseSpacesInRequirePath */)).to.be.true;
        chai_1.expect(b1.has(0 /* UseSpacesInRequirePath */, false)).to.be.false;
        const b2 = new nodeBinaryProvider_1.NodeBinary('', new semver_1.Semver(12, 0, 0));
        chai_1.expect(b2.has(0 /* UseSpacesInRequirePath */)).to.be.true;
        chai_1.expect(b2.has(0 /* UseSpacesInRequirePath */, false)).to.be.true;
    });
});
//# sourceMappingURL=nodeBinaryProvider.test.js.map
//# sourceMappingURL=nodeBinaryProvider.test.js.map
