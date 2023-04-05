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
exports.VSCodeSessionManager = void 0;
const vscode = __importStar(require("vscode"));
const serverSessionManager_1 = require("../serverSessionManager");
const sessionManager_1 = require("../sessionManager");
/**
 * Session launcher which uses vscode's `startDebugging` method to start a new debug session
 * @param parentSession The parent debug session to pass to `startDebugging`
 * @param config Launch configuration for the new debug session
 */
class VsCodeSessionLauncher {
    launch(parentSession, target, config) {
        vscode.debug.startDebugging(parentSession.debugSession.workspaceFolder, Object.assign(Object.assign(Object.assign({}, config), target.supplementalConfig), { 
            // Preserve the `serverReadyAction` so children hook into it when echo'ing console
            // (ref #362) but not if running in the integrated terminal (ref #814)
            serverReadyAction: parentSession.debugSession.configuration.console === 'integratedTerminal'
                ? undefined
                : parentSession.debugSession.configuration.serverReadyAction, __parentId: parentSession.debugSession.id }), {
            parentSession: parentSession.debugSession,
            consoleMode: vscode.DebugConsoleMode.MergeWithParent,
            noDebug: parentSession.debugSession.configuration.noDebug,
            compact: parentSession instanceof sessionManager_1.RootSession,
        });
    }
}
/**
 * VS Code specific session manager which also implements the DebugAdapterDescriptorFactory
 * interface
 */
class VSCodeSessionManager {
    constructor(globalContainer) {
        this.sessionServerManager = new serverSessionManager_1.ServerSessionManager(globalContainer, new VsCodeSessionLauncher());
    }
    /**
     * @inheritdoc
     */
    async createDebugAdapterDescriptor(debugSession) {
        const result = await this.sessionServerManager.createDebugServer(debugSession);
        return new vscode.DebugAdapterServer(result.server.address().port);
    }
    /**
     * @inheritdoc
     */
    terminate(debugSession) {
        this.sessionServerManager.terminate(debugSession);
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.sessionServerManager.dispose();
    }
}
exports.VSCodeSessionManager = VSCodeSessionManager;
//# sourceMappingURL=vsCodeSessionManager.js.map
//# sourceMappingURL=vsCodeSessionManager.js.map
