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
exports.registerCompanionBrowserLaunch = void 0;
const url_1 = require("url");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const localize = nls.loadMessageBundle();
const sessionTunnels = new Map();
const isTunnelForPort = (port) => (tunnel) => typeof tunnel.localAddress === 'string'
    ? tunnel.localAddress.endsWith(`:${port}`)
    : tunnel.localAddress.port === port;
const tunnelRemoteServerIfNecessary = async (args) => {
    const urlStr = args.params.url;
    if (!urlStr) {
        return;
    }
    let url;
    try {
        url = new url_1.URL(urlStr);
    }
    catch (e) {
        return;
    }
    if (!contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.automaticallyTunnelRemoteServer" /* AutoServerTunnelOpen */)) {
        return;
    }
    const port = Number(url.port) || 80;
    const tunnels = await vscode.workspace.tunnels;
    if (tunnels.some(isTunnelForPort(port))) {
        return;
    }
    try {
        await vscode.workspace.openTunnel({
            remoteAddress: { port, host: 'localhost' },
            localAddressPort: port,
        });
    }
    catch (_a) {
        // throws if already forwarded by user or by us previously
    }
};
const launchCompanionBrowser = async (session, args) => {
    if (vscode.env.uiKind === vscode.UIKind.Web) {
        return vscode.window.showErrorMessage(localize('cannotDebugInBrowser', "We can't launch a browser in debug mode from here. Open this workspace in VS Code on your desktop to enable debugging."));
    }
    try {
        const [, tunnel] = await Promise.all([
            tunnelRemoteServerIfNecessary(args),
            Promise.resolve(vscode.workspace.openTunnel({
                remoteAddress: { port: args.serverPort, host: 'localhost' },
                localAddressPort: args.serverPort,
                label: 'Browser Debug Tunnel',
            })).catch(() => undefined),
        ]);
        if (tunnel) {
            sessionTunnels.set(session.id, tunnel);
        }
        await vscode.commands.executeCommand('js-debug-companion.launchAndAttach', Object.assign({ proxyUri: tunnel ? `127.0.0.1:${tunnel.remoteAddress.port}` : `127.0.0.1:${args.serverPort}` }, args));
    }
    catch (e) {
        vscode.window.showErrorMessage(`Error launching browser: ${e.message || e.stack}`);
    }
};
const killCompanionBrowser = (session, { launchId }) => {
    vscode.commands.executeCommand('js-debug-companion.kill', { launchId });
    disposeSessionTunnel(session);
};
const disposeSessionTunnel = (session) => {
    var _a;
    (_a = sessionTunnels.get(session.id)) === null || _a === void 0 ? void 0 : _a.dispose();
    sessionTunnels.delete(session.id);
};
function registerCompanionBrowserLaunch(context) {
    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(disposeSessionTunnel), vscode.debug.onDidReceiveDebugSessionCustomEvent(async (event) => {
        switch (event.event) {
            case 'launchBrowserInCompanion':
                return launchCompanionBrowser(event.session, event.body);
            case 'killCompanionBrowser':
                return killCompanionBrowser(event.session, event.body);
            default:
            // ignored
        }
    }));
}
exports.registerCompanionBrowserLaunch = registerCompanionBrowserLaunch;
//# sourceMappingURL=companionBrowserLaunch.js.map
//# sourceMappingURL=companionBrowserLaunch.js.map
