"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructInspectorWSUri = void 0;
const url_1 = require("url");
const objUtils_1 = require("../../common/objUtils");
/**
 * Returns WebSocket (`ws(s)://`) address of the inspector to use. This function interpolates the inspect uri from the browser inspect uri and other values. Available keys are:
 *
 *  - `url.*` is the parsed address of the running application. For instance,
 *    `{url.port}`, `{url.hostname}`
 *  - `port` is the debug port that Chrome is listening on.
 *  - `browserInspectUri` is the inspector URI on the launched browser
 *  - `wsProtocol` is the hinted websocket protocol. This is set to `wss` if the original URL is `https`, or `ws` otherwise.
 */
function constructInspectorWSUri(inspectUriFormat, urlText, browserInspectUri) {
    const getUrl = objUtils_1.memoize((maybeText) => {
        if (maybeText) {
            return new url_1.URL(maybeText);
        }
        else {
            throw new Error(`A valid url wasn't supplied: <${maybeText}>`);
        }
    });
    // We map keys to functions, so we won't fail with a missing url unless the inspector uri format is actually referencing the url
    const replacements = {
        'url.hostname': () => getUrl(urlText).hostname,
        'url.port': () => getUrl(urlText).port,
        browserInspectUri: () => encodeURIComponent(browserInspectUri),
        browserInspectUriPath: () => new url_1.URL(browserInspectUri).pathname,
        wsProtocol: () => (getUrl(urlText).protocol === 'https:' ? 'wss' : 'ws'),
    };
    const inspectUri = inspectUriFormat.replace(/{([^\}]+)}/g, (match, key) => replacements.hasOwnProperty(key) ? replacements[key]() : match);
    return inspectUri;
}
exports.constructInspectorWSUri = constructInspectorWSUri;
//# sourceMappingURL=constructInspectorWSUri.js.map
//# sourceMappingURL=constructInspectorWSUri.js.map
