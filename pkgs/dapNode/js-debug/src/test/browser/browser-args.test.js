"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const browserArgs_1 = require("../../targets/browser/browserArgs");
const chai_1 = require("chai");
describe('BrowserArgs', () => {
    it('merge', () => {
        const actual = new browserArgs_1.BrowserArgs(['--a', '--b=foo']).merge(['--b=bar', '--c']);
        chai_1.expect(actual.toArray()).to.deep.equal(['--a', '--b=bar', '--c']);
    });
    it('add', () => {
        const actual = new browserArgs_1.BrowserArgs(['--a', '--b=foo']).add('--a').add('--b', 'bar').add('--c');
        chai_1.expect(actual.toArray()).to.deep.equal(['--a', '--b=bar', '--c']);
    });
    it('remove', () => {
        const actual = new browserArgs_1.BrowserArgs(['--a', '--b=foo']).remove('--b');
        chai_1.expect(actual.toArray()).to.deep.equal(['--a']);
    });
    it('getSuggestedConnection', () => {
        chai_1.expect(new browserArgs_1.BrowserArgs(['--a', '--b=foo']).getSuggestedConnection()).to.be.undefined;
        chai_1.expect(new browserArgs_1.BrowserArgs(['--a', '--remote-debugging-port=42']).getSuggestedConnection()).to.equal(42);
        chai_1.expect(new browserArgs_1.BrowserArgs(['--a', '--remote-debugging-pipe']).getSuggestedConnection()).to.equal('pipe');
    });
    it('setConnection', () => {
        const original = new browserArgs_1.BrowserArgs([
            '--a',
            '--remote-debugging-port=42',
            '--remote-debugging-pipe',
        ]);
        chai_1.expect(original.setConnection('pipe').toArray()).to.deep.equal([
            '--a',
            '--remote-debugging-pipe',
        ]);
        chai_1.expect(original.setConnection(1337).toArray()).to.deep.equal([
            '--a',
            '--remote-debugging-port=1337',
        ]);
    });
    it('filter', () => {
        const actual = new browserArgs_1.BrowserArgs(['--a', '--b=42', '--c=44']).filter((k, v) => k === '--b' || v === '44');
        chai_1.expect(actual.toArray()).to.deep.equal(['--b=42', '--c=44']);
    });
});
//# sourceMappingURL=browser-args.test.js.map
//# sourceMappingURL=browser-args.test.js.map
