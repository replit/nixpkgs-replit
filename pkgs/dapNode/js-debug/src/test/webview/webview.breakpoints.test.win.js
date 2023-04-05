"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('webview breakpoints', () => {
    async function waitForPause(p, cb) {
        const { threadId } = p.log(await p.dap.once('stopped'));
        await p.logger.logStackTrace(threadId);
        if (cb)
            await cb(threadId);
        return p.dap.continue({ threadId });
    }
    testIntegrationUtils_1.itIntegrates('launched script', async ({ r, context }) => {
        context.timeout(30 * 1000);
        // Breakpoint in separate script set after launch.
        const p = await r.launchUrl('script.html', {
            type: "pwa-msedge" /* Edge */,
            runtimeExecutable: r.workspacePath('webview/win/WebView2Sample.exe'),
            useWebView: true,
            // WebView2Sample.exe launches about:blank
            urlFilter: 'about:blank',
        });
        p.load();
        await waitForPause(p, async () => {
            const source = {
                path: p.workspacePath('web/script.js'),
            };
            await p.dap.setBreakpoints({ source, breakpoints: [{ line: 6 }] });
        });
        await waitForPause(p);
        p.assertLog();
    });
});
//# sourceMappingURL=webview.breakpoints.test.win.js.map
//# sourceMappingURL=webview.breakpoints.test.win.js.map
