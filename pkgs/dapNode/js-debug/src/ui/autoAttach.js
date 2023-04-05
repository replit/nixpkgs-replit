"use strict";
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
exports.registerAutoAttach = void 0;
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const portLeaseTracker_1 = require("../adapter/portLeaseTracker");
const contributionUtils_1 = require("../common/contributionUtils");
const proxyLogger_1 = require("../common/logging/proxyLogger");
const ioc_extras_1 = require("../ioc-extras");
const autoAttachLauncher_1 = require("../targets/node/autoAttachLauncher");
const nodeBinaryProvider_1 = require("../targets/node/nodeBinaryProvider");
const packageJsonProvider_1 = require("../targets/node/packageJsonProvider");
const sourcePathResolverFactory_1 = require("../targets/sourcePathResolverFactory");
const debugTerminalUI_1 = require("./debugTerminalUI");
const localize = nls.loadMessageBundle();
function registerAutoAttach(context, delegate, services) {
    let launcher;
    let disposeTimeout;
    const acquireLauncher = () => {
        if (launcher) {
            return launcher;
        }
        launcher = (async () => {
            const logger = new proxyLogger_1.ProxyLogger();
            // TODO: Figure out how to inject FsUtils
            const inst = new autoAttachLauncher_1.AutoAttachLauncher(new nodeBinaryProvider_1.NodeBinaryProvider(logger, services.get(ioc_extras_1.FS), packageJsonProvider_1.noPackageJsonProvider), logger, context, services.get(ioc_extras_1.FS), services.get(sourcePathResolverFactory_1.NodeOnlyPathResolverFactory), services.get(portLeaseTracker_1.IPortLeaseTracker));
            await debugTerminalUI_1.launchVirtualTerminalParent(delegate, inst, contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.terminalOptions" /* TerminalDebugConfig */));
            inst.onTargetListChanged(() => {
                if (inst.targetList().length === 0 && !disposeTimeout) {
                    disposeTimeout = setTimeout(() => {
                        launcher = undefined;
                        inst.terminate();
                    }, 5 * 60 * 1000);
                }
                else if (disposeTimeout) {
                    clearTimeout(disposeTimeout);
                    disposeTimeout = undefined;
                }
            });
            return inst;
        })();
        return launcher;
    };
    context.subscriptions.push(contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.setAutoAttachVariables" /* AutoAttachSetVariables */, async () => {
        try {
            const launcher = await acquireLauncher();
            return { ipcAddress: launcher.deferredSocketName };
        }
        catch (e) {
            if (e instanceof autoAttachLauncher_1.AutoAttachPreconditionFailed && e.helpLink) {
                const details = localize('details', 'Details');
                if ((await vscode.window.showErrorMessage(e.message, details)) === details) {
                    vscode.env.openExternal(vscode.Uri.parse(e.helpLink));
                }
            }
            else {
                await vscode.window.showErrorMessage(e.message);
            }
        }
    }), vscode.workspace.onDidChangeWorkspaceFolders(() => {
        launcher === null || launcher === void 0 ? void 0 : launcher.then(l => l.refreshVariables());
    }), contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.autoAttachToProcess" /* AutoAttachToProcess */, async (info) => {
        try {
            const launcher = await acquireLauncher();
            launcher.spawnForChild(info);
        }
        catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(`Error activating auto attach: ${err.stack || err}`);
        }
    }), contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.clearAutoAttachVariables" /* AutoAttachClearVariables */, async () => {
        autoAttachLauncher_1.AutoAttachLauncher.clearVariables(context);
        const inst = await launcher;
        if (inst) {
            inst.terminate();
            launcher = undefined;
        }
    }));
}
exports.registerAutoAttach = registerAutoAttach;
//# sourceMappingURL=autoAttach.js.map
//# sourceMappingURL=autoAttach.js.map
