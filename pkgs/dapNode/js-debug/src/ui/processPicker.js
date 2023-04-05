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
exports.pickProcess = exports.resolveProcessId = exports.attachProcess = void 0;
const child_process_1 = require("child_process");
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const configuration_1 = require("../configuration");
const processTree_1 = require("./processTree/processTree");
const contributionUtils_1 = require("../common/contributionUtils");
const urlUtils_1 = require("../common/urlUtils");
const pathUtils_1 = require("../common/pathUtils");
const fsUtils_1 = require("../common/fsUtils");
const fs_1 = require("fs");
const INSPECTOR_PORT_DEFAULT = 9229;
const localize = nls.loadMessageBundle();
/**
 * end user action for picking a process and attaching debugger to it
 */
async function attachProcess() {
    // We pick here, rather than just putting the command as the process ID, so
    // that the cwd is set correctly in multi-root workspaces.
    const processId = await pickProcess();
    if (!processId) {
        return;
    }
    const userDefaults = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.pickAndAttachOptions" /* PickAndAttachDebugOptions */);
    const config = Object.assign(Object.assign(Object.assign({}, configuration_1.nodeAttachConfigDefaults), userDefaults), { name: 'process', processId });
    // TODO: Figure out how to inject FsUtils
    await resolveProcessId(new fsUtils_1.LocalFsUtils(fs_1.promises), config, true);
    await vscode.debug.startDebugging(config.cwd ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(config.cwd)) : undefined, config);
}
exports.attachProcess = attachProcess;
/**
 * Resolves the requested process ID, and updates the config object
 * appropriately. Returns true if the configuration was updated, false
 * if it was cancelled.
 */
async function resolveProcessId(fsUtils, config, setCwd = false) {
    var _a;
    // we resolve Process Picker early (before VS Code) so that we can probe the process for its protocol
    const processId = (_a = config.processId) === null || _a === void 0 ? void 0 : _a.trim();
    const result = processId && decodePidAndPort(processId);
    if (!result || isNaN(result.pid)) {
        throw new Error(localize('process.id.error', "Attach to process: '{0}' doesn't look like a process id.", processId));
    }
    if (!result.port) {
        putPidInDebugMode(result.pid);
    }
    config.port = result.port || INSPECTOR_PORT_DEFAULT;
    delete config.processId;
    if (setCwd) {
        const inferredWd = await inferWorkingDirectory(fsUtils, result.pid);
        if (inferredWd) {
            config.cwd = inferredWd;
        }
    }
}
exports.resolveProcessId = resolveProcessId;
async function inferWorkingDirectory(fsUtils, processId) {
    var _a;
    const inferredWd = processId && (await processTree_1.processTree.getWorkingDirectory(processId));
    // If we couldn't infer the working directory, just use the first workspace folder
    if (!inferredWd) {
        return (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
    }
    const packageRoot = await urlUtils_1.nearestDirectoryContaining(fsUtils, inferredWd, 'package.json');
    if (!packageRoot) {
        return inferredWd;
    }
    // Find the working directory package root. If the original inferred working
    // directory was inside a workspace folder, don't go past that.
    const parentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(inferredWd));
    return !parentWorkspaceFolder || pathUtils_1.isSubdirectoryOf(parentWorkspaceFolder.uri.fsPath, packageRoot)
        ? packageRoot
        : parentWorkspaceFolder.uri.fsPath;
}
/**
 * Process picker command (for launch config variable). Returns a string in
 * the format `pid:port`, where port is optional.
 */
async function pickProcess() {
    try {
        const item = await listProcesses();
        return item ? item.pidAndPort : null;
    }
    catch (err) {
        await vscode.window.showErrorMessage(localize('process.picker.error', 'Process picker failed ({0})', err.message), { modal: true });
        return null;
    }
}
exports.pickProcess = pickProcess;
//---- private
const encodePidAndPort = (processId, port) => `${processId}:${port !== null && port !== void 0 ? port : ''}`;
const decodePidAndPort = (encoded) => {
    const [pid, port] = encoded.split(':');
    return { pid: Number(pid), port: port ? Number(port) : undefined };
};
async function listProcesses() {
    const nodeProcessPattern = /^(?:node|iojs)$/i;
    let seq = 0; // default sort key
    const quickPick = await vscode.window.createQuickPick();
    quickPick.placeholder = localize('pickNodeProcess', 'Pick the node.js process to attach to');
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.busy = true;
    quickPick.show();
    let hasPicked = false;
    const itemPromise = new Promise(resolve => {
        quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
        quickPick.onDidHide(() => resolve(undefined));
    });
    processTree_1.processTree
        .lookup((leaf, acc) => {
        if (hasPicked) {
            return acc;
        }
        if (process.platform === 'win32' && leaf.command.indexOf('\\??\\') === 0) {
            // remove leading device specifier
            leaf.command = leaf.command.replace('\\??\\', '');
        }
        const executableName = path_1.basename(leaf.command, '.exe');
        const { port } = processTree_1.analyseArguments(leaf.args);
        if (!port && !nodeProcessPattern.test(executableName)) {
            return acc;
        }
        const newItem = {
            label: executableName,
            description: leaf.args,
            pidAndPort: encodePidAndPort(leaf.pid, port),
            sortKey: leaf.date ? leaf.date : seq++,
            detail: port
                ? localize('process.id.port.signal', 'process id: {0}, debug port: {1} ({2})', leaf.pid, port, 'SIGUSR1')
                : localize('process.id.signal', 'process id: {0} ({1})', leaf.pid, 'SIGUSR1'),
        };
        const index = acc.findIndex(item => item.sortKey < newItem.sortKey);
        acc.splice(index === -1 ? acc.length : index, 0, newItem);
        quickPick.items = acc;
        return acc;
    }, [])
        .then(() => (quickPick.busy = false));
    const item = await itemPromise;
    hasPicked = true;
    quickPick.dispose();
    return item;
}
function putPidInDebugMode(pid) {
    try {
        if (process.platform === 'win32') {
            // regular node has an undocumented API function for forcing another node process into debug mode.
            // 		(<any>process)._debugProcess(pid);
            // But since we are running on Electron's node, process._debugProcess doesn't work (for unknown reasons).
            // So we use a regular node instead:
            const command = `node -e process._debugProcess(${pid})`;
            child_process_1.execSync(command);
        }
        else {
            process.kill(pid, 'SIGUSR1');
        }
    }
    catch (e) {
        throw new Error(localize('cannot.enable.debug.mode.error', "Attach to process: cannot enable debug mode for process '{0}' ({1}).", pid, e));
    }
}
//# sourceMappingURL=processPicker.js.map
//# sourceMappingURL=processPicker.js.map
