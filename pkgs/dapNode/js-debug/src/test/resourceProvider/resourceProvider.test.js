"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs_1 = require("fs");
const basicResourceProvider_1 = require("../../adapter/resourceProvider/basicResourceProvider");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('resourceProvider', () => {
    async function waitForPause(p, cb) {
        const { threadId } = p.log(await p.dap.once('stopped'));
        await p.logger.logStackTrace(threadId);
        if (cb)
            await cb(threadId);
        return p.dap.continue({ threadId });
    }
    testIntegrationUtils_1.itIntegrates('applies cookies', async ({ r }) => {
        // Breakpoint in source mapped script set before launch.
        // Note: this only works in Chrome 76 or later and Node 12 or later, since it relies
        // on 'pause before executing script with source map' functionality in CDP.
        const p = await r.launchUrl('cookies/home');
        p.load();
        await waitForPause(p);
        p.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('follows redirects', async ({ r }) => {
        const p = await r.launchUrl('redirect-test/home');
        p.load();
        p.log(await p.waitForSource('module1.ts'));
        p.assertLog();
    });
    it('decodes base64 data uris', async () => {
        const rp = new basicResourceProvider_1.BasicResourceProvider(fs_1.promises);
        chai_1.expect(await rp.fetch('data:text/plain;base64,SGVsbG8gd29ybGQh')).to.deep.equal({
            ok: true,
            statusCode: 200,
            body: 'Hello world!',
        });
    });
    it('decodes utf8 data uris (#662)', async () => {
        const rp = new basicResourceProvider_1.BasicResourceProvider(fs_1.promises);
        chai_1.expect(await rp.fetch('data:text/plain;utf-8,Hello%20world!')).to.deep.equal({
            ok: true,
            statusCode: 200,
            body: 'Hello world!',
        });
    });
    it('fetches remote url', async () => {
        const rp = new basicResourceProvider_1.BasicResourceProvider(fs_1.promises);
        chai_1.expect(await rp.fetch('http://localhost:8001/greet')).to.deep.equal({
            ok: true,
            statusCode: 200,
            body: 'Hello world!',
        });
    });
    it('follows redirects (unit)', async () => {
        const rp = new basicResourceProvider_1.BasicResourceProvider(fs_1.promises);
        chai_1.expect(await rp.fetch('http://localhost:8001/redirect-to-greet')).to.deep.equal({
            ok: true,
            statusCode: 200,
            body: 'Hello world!',
        });
    });
    it('applies request options', async () => {
        const rp = new basicResourceProvider_1.BasicResourceProvider(fs_1.promises, {
            provideOptions: opts => {
                opts.headers = { cool: 'true' };
            },
        });
        const res = await rp.fetch('http://localhost:8001/view-headers');
        chai_1.expect(JSON.parse(res.body || 'no content')).to.containSubset({ cool: 'true' });
    });
});
//# sourceMappingURL=resourceProvider.test.js.map
//# sourceMappingURL=resourceProvider.test.js.map
