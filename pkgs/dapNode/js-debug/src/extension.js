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
exports.deactivate = exports.activate = void 0;
const os_1 = require("os");
const vscode = __importStar(require("vscode"));
const contributionUtils_1 = require("./common/contributionUtils");
const configuration_1 = require("./configuration");
const ioc_1 = require("./ioc");
const ioc_extras_1 = require("./ioc-extras");
const delegateLauncherFactory_1 = require("./targets/delegate/delegateLauncherFactory");
const autoAttach_1 = require("./ui/autoAttach");
const companionBrowserLaunch_1 = require("./ui/companionBrowserLaunch");
const configuration_2 = require("./ui/configuration");
const customBreakpointsUI_1 = require("./ui/customBreakpointsUI");
const debugNpmScript_1 = require("./ui/debugNpmScript");
const debugSessionTracker_1 = require("./ui/debugSessionTracker");
const debugTerminalUI_1 = require("./ui/debugTerminalUI");
const prettyPrint_1 = require("./ui/prettyPrint");
const processPicker_1 = require("./ui/processPicker");
const profiling_1 = require("./ui/profiling");
const requestCDPProxy_1 = require("./ui/requestCDPProxy");
const revealPage_1 = require("./ui/revealPage");
const terminalLinkHandler_1 = require("./ui/terminalLinkHandler");
const toggleSkippingFile_1 = require("./ui/toggleSkippingFile");
const vsCodeSessionManager_1 = require("./ui/vsCodeSessionManager");
function activate(context) {
    var _a;
    const services = ioc_1.createGlobalContainer({
        // On Windows, use the os.tmpdir() since the extension storage path is too long. See:
        // https://github.com/microsoft/vscode-js-debug/issues/342
        storagePath: process.platform === 'win32' ? os_1.tmpdir() : context.storagePath || context.extensionPath,
        isVsCode: true,
        isRemote: !!process.env.JS_DEBUG_USE_COMPANION ||
            ((_a = vscode.extensions.getExtension(configuration_1.extensionId)) === null || _a === void 0 ? void 0 : _a.extensionKind) === vscode.ExtensionKind.Workspace,
        context,
    });
    context.subscriptions.push(contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.npmScript" /* DebugNpmScript */, debugNpmScript_1.debugNpmScript), contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.pickNodeProcess" /* PickProcess */, processPicker_1.pickProcess), contributionUtils_1.registerCommand(vscode.commands, "extension.pwa-node-debug.attachNodeProcess" /* AttachProcess */, processPicker_1.attachProcess), contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.toggleSkippingFile" /* ToggleSkipping */, toggleSkippingFile_1.toggleSkippingFile));
    context.subscriptions.push(...services
        .getAll(configuration_2.IDebugConfigurationResolver)
        .map(provider => vscode.debug.registerDebugConfigurationProvider(provider.type, provider)), ...services
        .getAll(configuration_2.IDebugConfigurationProvider)
        .map(provider => vscode.debug.registerDebugConfigurationProvider(provider.type, provider, vscode.DebugConfigurationProviderTriggerKind !== undefined
        ? provider.triggerKind
        : undefined)));
    const sessionManager = new vsCodeSessionManager_1.VSCodeSessionManager(services);
    context.subscriptions.push(...[...contributionUtils_1.allDebugTypes].map(type => vscode.debug.registerDebugAdapterDescriptorFactory(type, sessionManager)));
    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(s => sessionManager.terminate(s)));
    context.subscriptions.push(sessionManager);
    const debugSessionTracker = services.get(debugSessionTracker_1.DebugSessionTracker);
    debugSessionTracker.attach();
    context.subscriptions.push(prettyPrint_1.PrettyPrintTrackerFactory.register(debugSessionTracker));
    companionBrowserLaunch_1.registerCompanionBrowserLaunch(context);
    customBreakpointsUI_1.registerCustomBreakpointsUI(context, debugSessionTracker);
    debugTerminalUI_1.registerDebugTerminalUI(context, services.get(delegateLauncherFactory_1.DelegateLauncherFactory), services.get(terminalLinkHandler_1.TerminalLinkHandler), services);
    profiling_1.registerProfilingCommand(context, services);
    autoAttach_1.registerAutoAttach(context, services.get(delegateLauncherFactory_1.DelegateLauncherFactory), services);
    revealPage_1.registerRevealPage(context, debugSessionTracker);
    requestCDPProxy_1.registerRequestCDPProxy(context, debugSessionTracker);
    services.getAll(ioc_extras_1.IExtensionContribution).forEach(c => c.register(context));
}
exports.activate = activate;
function deactivate() {
    // nothing to do, yet...
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
//# sourceMappingURL=extension.js.map
