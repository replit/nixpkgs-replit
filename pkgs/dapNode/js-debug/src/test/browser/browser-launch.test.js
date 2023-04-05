"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs_1 = require("fs");
const ws_1 = __importDefault(require("ws"));
const constructInspectorWSUri_1 = require("../../targets/browser/constructInspectorWSUri");
const test_1 = require("../test");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('browser launch', () => {
    testIntegrationUtils_1.itIntegrates('environment variables', async ({ r }) => {
        if (process.platform === 'win32') {
            return; // Chrome on windows doesn't set the TZ correctly
        }
        const p = await r.launchUrlAndLoad('index.html', {
            env: {
                TZ: 'GMT',
            },
        });
        await p.logger.evaluateAndLog(`new Date().getTimezoneOffset()`);
        r.assertLog();
    });
    testIntegrationUtils_1.itIntegrates('runtime args', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html', {
            runtimeArgs: ['--window-size=678,456'],
        });
        await p.logger.evaluateAndLog(`[window.outerWidth, window.outerHeight]`);
        r.assertLog();
    });
    testIntegrationUtils_1.itIntegrates.skip('user data dir', async ({ r }) => {
        fs_1.mkdirSync(test_1.testFixturesDir, { recursive: true });
        chai_1.expect(fs_1.readdirSync(test_1.testFixturesDir)).to.be.empty;
        await r.launchUrlAndLoad('index.html', {
            userDataDir: test_1.testFixturesDir,
        });
        chai_1.expect(fs_1.readdirSync(test_1.testFixturesDir)).to.not.be.empty;
    });
    testIntegrationUtils_1.itIntegrates('connects to rewritten websocket when using inspectUri parameter', async ({ r }) => {
        const pagePort = 5935;
        const wsServer = new ws_1.default.Server({ port: pagePort, path: '/_framework/debug/ws-proxy' });
        try {
            const receivedMessage = new Promise(resolve => {
                wsServer.on('connection', ws => {
                    ws.on('message', message => {
                        const contents = JSON.parse(message.toString());
                        ws.send(JSON.stringify({ id: contents.id, error: { message: 'Fake websocket' } }));
                        resolve(message.toString()); // We resolve with the contents of the first message we receive
                    });
                });
            });
            r.launchUrl(`index.html`, {
                inspectUri: `{wsProtocol}://{url.hostname}:${pagePort}/_framework/debug/ws-proxy?browser={browserInspectUri}`,
            }); // We don't care about the launch result, as long as we connect to the WebSocket
            chai_1.expect(await receivedMessage).to.be.eq('{"id":1001,"method":"Target.attachToBrowserTarget","params":{}}'); // Verify we got the first message on the WebSocket
        }
        finally {
            await new Promise(r => wsServer.close(r));
        }
    });
});
describe('constructInspectorWSUri', () => {
    const inspectUri = '{wsProtocol}://{url.hostname}:{url.port}/_framework/debug/ws-proxy?browser={browserInspectUri}';
    const appHttpUrl = 'http://localhost:5001/';
    const browserWsInspectUri = 'ws://127.0.0.1:36775/devtools/browser/a292f96c-7332-4ce8-82a9-7411f3bd280a';
    const encodedBrowserWsInspectUri = encodeURIComponent(browserWsInspectUri);
    const appHttpsUrl = 'https://localhost:5001/';
    it('interpolates arguments to construct inspectUri', () => {
        chai_1.expect(constructInspectorWSUri_1.constructInspectorWSUri(inspectUri, appHttpUrl, browserWsInspectUri)).to.be.eq(`ws://localhost:5001/_framework/debug/ws-proxy?browser=${encodedBrowserWsInspectUri}`);
        chai_1.expect(constructInspectorWSUri_1.constructInspectorWSUri(inspectUri, appHttpsUrl, browserWsInspectUri)).to.be.eq(`wss://localhost:5001/_framework/debug/ws-proxy?browser=${encodedBrowserWsInspectUri}`);
    });
    it('does not do anything with arguments that does not exist', () => {
        chai_1.expect(constructInspectorWSUri_1.constructInspectorWSUri(inspectUri + '&{iDoNotExist}{meEither}', appHttpUrl, browserWsInspectUri)).to.be.eq(`ws://localhost:5001/_framework/debug/ws-proxy?browser=${encodedBrowserWsInspectUri}&{iDoNotExist}{meEither}`);
    });
    it('fails with an useful error for invalid urls', () => {
        chai_1.expect(() => constructInspectorWSUri_1.constructInspectorWSUri(inspectUri, '.not_an_url', browserWsInspectUri)).to.throw('Invalid URL: .not_an_url');
        chai_1.expect(() => constructInspectorWSUri_1.constructInspectorWSUri(inspectUri, null, browserWsInspectUri)).to.throw(`A valid url wasn't supplied: <null>`);
        chai_1.expect(() => constructInspectorWSUri_1.constructInspectorWSUri(inspectUri, undefined, browserWsInspectUri)).to.throw(`A valid url wasn't supplied: <undefined>`);
        chai_1.expect(() => constructInspectorWSUri_1.constructInspectorWSUri(inspectUri, '', browserWsInspectUri)).to.throw(`A valid url wasn't supplied: <>`);
    });
    const noUrlInspectUri = 'ws://localhost:1234/_framework/debug/ws-proxy?browser={browserInspectUri}';
    it('does not fail for an invalid url if it isnt used', () => {
        chai_1.expect(constructInspectorWSUri_1.constructInspectorWSUri(noUrlInspectUri, '.not_an_url', browserWsInspectUri)).to.be.eq(`ws://localhost:1234/_framework/debug/ws-proxy?browser=${encodedBrowserWsInspectUri}`);
        chai_1.expect(constructInspectorWSUri_1.constructInspectorWSUri(noUrlInspectUri, undefined, browserWsInspectUri)).to.be.eq(`ws://localhost:1234/_framework/debug/ws-proxy?browser=${encodedBrowserWsInspectUri}`);
    });
});
//# sourceMappingURL=browser-launch.test.js.map
//# sourceMappingURL=browser-launch.test.js.map
