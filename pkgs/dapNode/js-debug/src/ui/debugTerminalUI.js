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
exports.registerDebugTerminalUI = exports.launchVirtualTerminalParent = void 0;
const os_1 = require("os");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const portLeaseTracker_1 = require("../adapter/portLeaseTracker");
const cancellation_1 = require("../common/cancellation");
const contributionUtils_1 = require("../common/contributionUtils");
const proxyLogger_1 = require("../common/logging/proxyLogger");
const configuration_1 = require("../configuration");
const pending_api_1 = require("../dap/pending-api");
const ioc_extras_1 = require("../ioc-extras");
const nodeBinaryProvider_1 = require("../targets/node/nodeBinaryProvider");
const nodeTarget_1 = require("../targets/node/nodeTarget");
const packageJsonProvider_1 = require("../targets/node/packageJsonProvider");
const terminalNodeLauncher_1 = require("../targets/node/terminalNodeLauncher");
const sourcePathResolverFactory_1 = require("../targets/sourcePathResolverFactory");
const targetOrigin_1 = require("../targets/targetOrigin");
const dapTelemetryReporter_1 = require("../telemetry/dapTelemetryReporter");
const localize = nls.loadMessageBundle();
exports.launchVirtualTerminalParent = (delegate, launcher, options = {}) => {
    const telemetry = new dapTelemetryReporter_1.DapTelemetryReporter();
    const baseDebugOptions = Object.assign(Object.assign({}, contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.terminalOptions" /* TerminalDebugConfig */)), { 
        // Prevent switching over the the Debug Console whenever a process starts
        internalConsoleOptions: 'neverOpen' });
    // We don't have a debug session initially when we launch the terminal, so,
    // we create a shell DAP instance that queues messages until it gets attached
    // to a connection. Terminal processes don't use this too much except for
    // telemetry.
    const dap = pending_api_1.createPendingDapApi();
    telemetry.attachDap(dap);
    // Watch the set of targets we get from this terminal launcher. Remember
    // that we can get targets from child processes of session too. When we
    // get a new top-level target (one without a parent session), start
    // debugging. Removing delegated targets will automatically end debug
    // sessions. Once all are removed, reset the DAP since we'll get a new
    // instance for the next process that starts.
    let previousTargets = new Set();
    // Gets the ideal workspace folder for the given process.
    const getWorkingDirectory = async (target) => {
        var _a, _b;
        const telemetry = await launcher.getProcessTelemetry(target);
        const fromTelemetry = telemetry && vscode.Uri.file(telemetry.cwd);
        const preferred = fromTelemetry && vscode.workspace.getWorkspaceFolder(fromTelemetry);
        if (preferred) {
            return preferred.uri;
        }
        if (options.__workspaceFolder) {
            return vscode.Uri.file(options.__workspaceFolder);
        }
        return (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri) !== null && _b !== void 0 ? _b : fromTelemetry;
    };
    launcher.onTargetListChanged(async () => {
        const newTargets = new Set();
        for (const target of launcher.targetList()) {
            newTargets.add(target);
            if (previousTargets.has(target)) {
                previousTargets.delete(target);
                continue;
            }
            const delegateId = delegate.addDelegate(target, dap, target.parent());
            // Check that we didn't detach from the parent session.
            if (target.targetInfo.openerId && !target.parent()) {
                target.detach();
                return;
            }
            if (!(await vscode.workspace.requestWorkspaceTrust({ modal: true }))) {
                target.detach();
                return;
            }
            if (!target.parent()) {
                const cwd = await getWorkingDirectory(target);
                if (target instanceof nodeTarget_1.NodeTarget && cwd) {
                    target.refreshPathResolver(cwd.fsPath);
                }
                vscode.debug.startDebugging(cwd && vscode.workspace.getWorkspaceFolder(cwd), Object.assign(Object.assign({}, baseDebugOptions), { type: "node-terminal" /* Terminal */, name: 'Node.js Process', request: 'attach', delegateId, __workspaceFolder: cwd }));
            }
        }
        for (const target of previousTargets) {
            delegate.removeDelegate(target);
        }
        previousTargets = newTargets;
    });
    // Create a 'fake' launch request to the terminal, and run it!
    return launcher.launch(configuration_1.applyDefaults(Object.assign(Object.assign(Object.assign({}, baseDebugOptions), { type: "node-terminal" /* Terminal */, name: configuration_1.terminalBaseDefaults.name, request: 'launch' }), options)), {
        dap,
        telemetryReporter: telemetry,
        cancellationToken: cancellation_1.NeverCancelled,
        get targetOrigin() {
            // Use a getter so that each new session receives a new mutable origin.
            // This is needed so that processes booted in parallel each get their
            // own apparent debug session.
            return new targetOrigin_1.MutableTargetOrigin('<unset>');
        },
    });
};
const Abort = Symbol('Abort');
const home = os_1.homedir();
const tildify = process.platform === 'win32'
    ? s => s
    : s => (s.startsWith(home) ? `~${s.slice(home.length)}` : s);
async function getWorkspaceFolder() {
    var _a;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length < 2) {
        return folders === null || folders === void 0 ? void 0 : folders[0];
    }
    const picked = await vscode.window.showQuickPick(folders.map(folder => ({
        label: folder.name,
        description: tildify(folder.uri.fsPath),
        folder,
    })), {
        placeHolder: localize('terminal.cwdpick', 'Select current working directory for new terminal'),
    });
    return (_a = picked === null || picked === void 0 ? void 0 : picked.folder) !== null && _a !== void 0 ? _a : Abort;
}
/**
 * Registers a command to launch the debugger terminal.
 */
function registerDebugTerminalUI(context, delegateFactory, linkHandler, services) {
    var _a, _b;
    const terminals = new Map();
    /**
     * See docblocks on {@link DelegateLauncher} for more information on
     * how this works.
     */
    async function launchTerminal(delegate, command, workspaceFolder, defaultConfig) {
        if (!workspaceFolder) {
            const picked = await getWorkspaceFolder();
            if (picked === Abort) {
                return;
            }
            workspaceFolder = picked;
        }
        // try to reuse a terminal if invoked programmatically to run a command
        if (command) {
            for (const [terminal, config] of terminals) {
                if (config.folder === workspaceFolder &&
                    config.cwd === (defaultConfig === null || defaultConfig === void 0 ? void 0 : defaultConfig.cwd) &&
                    !config.launcher.targetList().length) {
                    terminal.show(true);
                    terminal.sendText(command);
                    return;
                }
            }
        }
        const logger = new proxyLogger_1.ProxyLogger();
        const launcher = new terminalNodeLauncher_1.TerminalNodeLauncher(new nodeBinaryProvider_1.NodeBinaryProvider(logger, services.get(ioc_extras_1.FS), packageJsonProvider_1.noPackageJsonProvider), logger, services.get(ioc_extras_1.FS), services.get(sourcePathResolverFactory_1.NodeOnlyPathResolverFactory), services.get(portLeaseTracker_1.IPortLeaseTracker));
        launcher.onTerminalCreated(terminal => {
            terminals.set(terminal, { launcher, folder: workspaceFolder, cwd: defaultConfig === null || defaultConfig === void 0 ? void 0 : defaultConfig.cwd });
            linkHandler.enableHandlingInTerminal(terminal);
        });
        try {
            await exports.launchVirtualTerminalParent(delegate, launcher, Object.assign(Object.assign({ command }, defaultConfig), { __workspaceFolder: workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri.fsPath }));
        }
        catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }
    context.subscriptions.push(vscode.window.onDidCloseTerminal(terminal => {
        terminals.delete(terminal);
    }), contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.createDebuggerTerminal" /* CreateDebuggerTerminal */, (command, folder, config) => launchTerminal(delegateFactory, command, folder, config)), (_b = (_a = vscode.window).registerTerminalLinkProvider) === null || _b === void 0 ? void 0 : _b.call(_a, linkHandler));
}
exports.registerDebugTerminalUI = registerDebugTerminalUI;
//# sourceMappingURL=debugTerminalUI.js.map
//# sourceMappingURL=debugTerminalUI.js.map
