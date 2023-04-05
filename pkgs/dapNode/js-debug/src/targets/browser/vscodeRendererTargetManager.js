"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeRendererTargetManager = void 0;
const url_1 = require("url");
const browserTargetManager_1 = require("./browserTargetManager");
class VSCodeRendererTargetManager extends browserTargetManager_1.BrowserTargetManager {
    /**
     * @override
     */
    static async connectRenderer(connection, sourcePathResolver, launchParams, logger, telemetry, targetOrigin) {
        const rootSession = connection.rootSession();
        const result = await rootSession.Target.attachToBrowserTarget({});
        if (!result)
            return;
        const browserSession = connection.createSession(result.sessionId);
        return new this(connection, undefined, browserSession, sourcePathResolver, logger, telemetry, launchParams, targetOrigin);
    }
    /**
     * @inheritdoc
     */
    waitForMainTarget(filter) {
        const params = this.launchParams;
        if (params.debugWebWorkerExtHost) {
            this._browser.Target.on('targetCreated', this.enqueueLifecycleFn(async ({ targetInfo }) => {
                if (!targetInfo.url.includes(params.__sessionId)) {
                    return;
                }
                const response = await this._browser.Target.attachToTarget({
                    targetId: targetInfo.targetId,
                    flatten: true,
                });
                if (response) {
                    this.attachedToTarget(targetInfo, response.sessionId, false);
                }
            }));
        }
        return super.waitForMainTarget(filter);
    }
    /**
     * @override
     */
    attachedToTarget(targetInfo, sessionId, waitingForDebugger, parentTarget) {
        const target = super.attachedToTarget(targetInfo, sessionId, waitingForDebugger, parentTarget, false);
        if (targetInfo.type === "iframe" /* IFrame */) {
            target.setComputeNameFn(computeWebviewName);
        }
        return target;
    }
}
exports.VSCodeRendererTargetManager = VSCodeRendererTargetManager;
const computeWebviewName = (target) => {
    let url;
    try {
        url = new url_1.URL(target.targetInfo.url);
    }
    catch (_a) {
        return;
    }
    switch (url.searchParams.get('purpose')) {
        case "customEditor" /* CustomEditor */:
            return `${url.searchParams.get('extensionId')} editor: ${url.host}`;
        case "notebookRenderer" /* NotebookRenderer */:
            return `Notebook Renderer: ${url.host}`;
        default:
            const extensionId = url.searchParams.get('extensionId');
            return `Webview: ${extensionId ? extensionId + ' ' : ''} ${url.host}`;
    }
};
//# sourceMappingURL=vscodeRendererTargetManager.js.map
//# sourceMappingURL=vscodeRendererTargetManager.js.map
