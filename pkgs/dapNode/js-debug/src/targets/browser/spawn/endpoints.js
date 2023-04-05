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
exports.retryGetBrowserEndpoint = exports.retryGetNodeEndpoint = exports.getWSEndpoint = void 0;
const fs_1 = require("fs");
const URL = __importStar(require("url"));
const basicResourceProvider_1 = require("../../../adapter/resourceProvider/basicResourceProvider");
const promiseUtil_1 = require("../../../common/promiseUtil");
/**
 * Returns the debugger websocket URL a process listening at the given address.
 * @param browserURL -- Address like `http://localhost:1234`
 * @param cancellationToken -- Optional cancellation for this operation
 */
async function getWSEndpoint(browserURL, cancellationToken, logger, isNode) {
    const provider = new basicResourceProvider_1.BasicResourceProvider(fs_1.promises);
    const [jsonVersion, jsonList] = await Promise.all([
        provider.fetchJson(URL.resolve(browserURL, '/json/version'), cancellationToken, { host: 'localhost' }),
        // Chrome publishes its top-level debugg on /json/version, while Node does not.
        // Request both and return whichever one got us a string. ONLY try this on
        // Node, since it'll cause a failure on browsers (vscode#123420)
        isNode
            ? provider.fetchJson(URL.resolve(browserURL, '/json/list'), cancellationToken, { host: 'localhost' })
            : Promise.resolve(undefined),
    ]);
    if (!jsonVersion.ok) {
        logger.verbose("runtime.launch" /* RuntimeLaunch */, 'Error looking up /json/version', jsonVersion);
    }
    else if (jsonVersion.body.webSocketDebuggerUrl) {
        const fixed = fixRemoteUrl(browserURL, jsonVersion.body.webSocketDebuggerUrl);
        logger.verbose("runtime.launch" /* RuntimeLaunch */, 'Discovered target URL from /json/version', {
            url: jsonVersion.body.webSocketDebuggerUrl,
            fixed,
        });
        return fixed;
    }
    if (!jsonList) {
        // no-op
    }
    else if (!jsonList.ok) {
        logger.verbose("runtime.launch" /* RuntimeLaunch */, 'Error looking up /json/list', jsonList);
    }
    else {
        const fixed = fixRemoteUrl(browserURL, jsonList.body[0].webSocketDebuggerUrl);
        logger.verbose("runtime.launch" /* RuntimeLaunch */, 'Discovered target URL from /json/list', {
            url: jsonList.body[0].webSocketDebuggerUrl,
            fixed,
        });
        return fixed;
    }
    throw new Error('Could not find any debuggable target');
}
exports.getWSEndpoint = getWSEndpoint;
const makeRetryGetWSEndpoint = (isNode) => async (browserURL, cancellationToken, logger) => {
    while (true) {
        try {
            return await getWSEndpoint(browserURL, cancellationToken, logger, isNode);
        }
        catch (e) {
            if (cancellationToken.isCancellationRequested) {
                throw new Error(`Could not connect to debug target at ${browserURL}: ${e.message}`);
            }
            await promiseUtil_1.delay(200);
        }
    }
};
/**
 * Attempts to retrieve the debugger websocket URL for a Node process listening
 * at the given address, retrying until available.
 * @param browserURL -- Address like `http://localhost:1234`
 * @param cancellationToken -- Optional cancellation for this operation
 */
exports.retryGetNodeEndpoint = makeRetryGetWSEndpoint(true);
/**
 * Attempts to retrieve the debugger websocket URL for a browser listening
 * at the given address, retrying until available.
 * @param browserURL -- Address like `http://localhost:1234`
 * @param cancellationToken -- Optional cancellation for this operation
 */
exports.retryGetBrowserEndpoint = makeRetryGetWSEndpoint(false);
function fixRemoteUrl(rawBrowserUrl, rawWebSocketUrl) {
    const browserUrl = new URL.URL(rawBrowserUrl);
    const websocketUrl = new URL.URL(rawWebSocketUrl);
    websocketUrl.host = browserUrl.host;
    return websocketUrl.toString();
}
//# sourceMappingURL=endpoints.js.map
//# sourceMappingURL=endpoints.js.map
