"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const chai_1 = require("chai");
const environmentVars_1 = require("./environmentVars");
describe('EnvironmentVars', () => {
    const vars = new environmentVars_1.EnvironmentVars({
        undef: undefined,
        null: null,
        foo: 'bar',
    });
    it('looks up properties', () => {
        chai_1.expect(vars.lookup('foo')).to.equal('bar');
        chai_1.expect(vars.lookup('wut')).to.be.undefined;
        chai_1.expect(vars.lookup('null')).to.be.null;
    });
    it('merges', () => {
        chai_1.expect(vars.merge({ foo: 'updated', bar: 'baz' }).value).to.deep.equal({
            null: null,
            foo: 'updated',
            bar: 'baz',
        });
    });
    it('adds node options', () => {
        const v1 = vars.addNodeOption('--foo');
        const v2 = v1.addNodeOption('--bar');
        chai_1.expect(v1.lookup('NODE_OPTIONS')).to.equal('--foo');
        chai_1.expect(v2.lookup('NODE_OPTIONS')).to.equal('--foo --bar');
    });
    it('filters code vars from process', () => {
        const r = environmentVars_1.getSanitizeProcessEnv({
            ELECTRON_RUN_AS_NODE: '1',
            VSCODE_LOGS: 'logs.txt',
            APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL: '1',
            IS_COOL: 'very',
        });
        chai_1.expect(r.defined()).to.deep.equal({ IS_COOL: 'very' });
    });
    describe('posix', () => {
        before(() => {
            environmentVars_1.EnvironmentVars.platform = 'linux';
        });
        after(() => {
            environmentVars_1.EnvironmentVars.platform = process.platform;
        });
        it('looks up case sensitive', () => {
            chai_1.expect(vars.lookup('foo')).to.equal('bar');
            chai_1.expect(vars.lookup('FOO')).to.be.undefined;
        });
        it('updates case sensitive', () => {
            const updated = vars.update('fOO', 'updated');
            chai_1.expect(updated.value.foo).to.equal('bar');
            chai_1.expect(updated.value.fOO).to.equal('updated');
        });
        it('creates a new path', () => {
            chai_1.expect(vars.addToPath('/usr/bin').value).to.containSubset({ PATH: '/usr/bin' });
            chai_1.expect(vars.addToPath('/usr/bin', 'prepend', true).value).to.containSubset({
                PATH: '/usr/bin:${env:PATH}',
            });
            chai_1.expect(vars.addToPath('/usr/bin', 'append', true).value).to.containSubset({
                PATH: '${env:PATH}:/usr/bin',
            });
        });
        it('adds to an existing path ', () => {
            chai_1.expect(vars.addToPath('/usr/local/bin').addToPath('/usr/bin').value).to.containSubset({
                PATH: '/usr/local/bin:/usr/bin',
            });
        });
    });
    describe('win32', () => {
        before(() => {
            environmentVars_1.EnvironmentVars.platform = 'win32';
        });
        after(() => {
            environmentVars_1.EnvironmentVars.platform = process.platform;
        });
        it('looks up case insensitive', () => {
            chai_1.expect(vars.lookup('FOO')).to.equal('bar');
            chai_1.expect(vars.lookup('foo')).to.equal('bar');
        });
        it('updates case insensitive', () => {
            const updated = vars.update('fOO', 'updated');
            chai_1.expect(updated.value.foo).to.equal('updated');
            chai_1.expect(updated.value.fOO).to.be.undefined;
        });
        it('creates a new path', () => {
            chai_1.expect(vars.addToPath('C:\\bin').value).to.containSubset({ Path: 'C:\\bin' });
            chai_1.expect(vars.addToPath('C:\\bin', 'prepend', true).value).to.containSubset({
                Path: 'C:\\bin;${env:Path}',
            });
            chai_1.expect(vars.addToPath('C:\\bin', 'append', true).value).to.containSubset({
                Path: '${env:Path};C:\\bin',
            });
        });
        it('adds to an existing path ', () => {
            chai_1.expect(vars.update('path', 'C:\\Python').addToPath('C:\\bin').value).to.containSubset({
                path: 'C:\\Python;C:\\bin',
            });
        });
    });
});
//# sourceMappingURL=environmentVars.test.js.map
//# sourceMappingURL=environmentVars.test.js.map
