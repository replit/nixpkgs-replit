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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoAttachPreconditionFailed = exports.AutoAttachLauncher = void 0;
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const portLeaseTracker_1 = require("../../adapter/portLeaseTracker");
const contributionUtils_1 = require("../../common/contributionUtils");
const logging_1 = require("../../common/logging");
const pathUtils_1 = require("../../common/pathUtils");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const sourcePathResolverFactory_1 = require("../sourcePathResolverFactory");
const environment_1 = require("./bootloader/environment");
const bundlePaths_1 = require("./bundlePaths");
const nodeBinaryProvider_1 = require("./nodeBinaryProvider");
const nodeLauncherBase_1 = require("./nodeLauncherBase");
const nodeTarget_1 = require("./nodeTarget");
const program_1 = require("./program");
const watchdogSpawn_1 = require("./watchdogSpawn");
/**
 * A special launcher whose launchProgram is a no-op. Used in attach attachment
 * to create the 'server'.
 */
let AutoAttachLauncher = class AutoAttachLauncher extends nodeLauncherBase_1.NodeLauncherBase {
    constructor(pathProvider, logger, extensionContext, fs, pathResolverFactory, portLeaseTracker) {
        super(pathProvider, logger, portLeaseTracker, pathResolverFactory);
        this.extensionContext = extensionContext;
        this.fs = fs;
        this.telemetryItems = new Map();
    }
    /**
     * Gets the address of the socket server that children must use to connect.
     */
    get deferredSocketName() {
        var _a;
        const options = this.extensionContext.environmentVariableCollection.get('VSCODE_INSPECTOR_OPTIONS');
        if (!options) {
            return;
        }
        const env = new environment_1.BootloaderEnvironment({ VSCODE_INSPECTOR_OPTIONS: options.value });
        return (_a = env.inspectorOptions) === null || _a === void 0 ? void 0 : _a.inspectorIpc;
    }
    /**
     * @inheritdoc
     */
    getProcessTelemetry(target) {
        return Promise.resolve(target instanceof nodeTarget_1.NodeTarget ? this.telemetryItems.get(target.processId()) : undefined);
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        if (params.type === "node-terminal" /* Terminal */ && params.request === 'launch') {
            return params;
        }
        return undefined;
    }
    /**
     * Launches the program.
     */
    async launchProgram(runData) {
        await this.applyInspectorOptions(this.extensionContext.environmentVariableCollection, runData);
        this.program = new program_1.StubProgram();
        this.program.stopped.then(data => this.onProgramTerminated(data));
    }
    /**
     * (Re-)applies the current variables to the terminals if a run is
     * currently happening.
     */
    async refreshVariables() {
        if (this.run) {
            await this.applyInspectorOptions(this.extensionContext.environmentVariableCollection, this.run);
        }
    }
    async applyInspectorOptions(variables, runData) {
        var _a;
        let binary;
        try {
            binary = await this.resolveNodePath(runData.params);
        }
        catch (e) {
            if (e instanceof protocolError_1.ProtocolError && e.cause.id === 9229 /* CannotFindNodeBinary */) {
                binary = new nodeBinaryProvider_1.NodeBinary('node', undefined);
            }
            else {
                throw e;
            }
        }
        const autoAttachMode = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.autoAttachFilter" /* AutoAttachMode */);
        const debugVars = await this.resolveEnvironment(runData, binary, {
            deferredMode: true,
            inspectorIpc: (_a = this.deferredSocketName) !== null && _a !== void 0 ? _a : runData.serverAddress + '.deferred',
            autoAttachMode,
            aaPatterns: autoAttachMode === "smart" /* Smart */ ? this.readSmartPatterns() : undefined,
        });
        const bootloaderEnv = debugVars.defined();
        variables.persistent = true;
        variables.prepend('NODE_OPTIONS', bootloaderEnv.NODE_OPTIONS + ' ');
        variables.append('VSCODE_INSPECTOR_OPTIONS', environment_1.variableDelimiter + bootloaderEnv.VSCODE_INSPECTOR_OPTIONS);
    }
    readSmartPatterns() {
        var _a;
        const configured = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.autoAttachSmartPattern" /* AutoAttachSmartPatterns */);
        const allFolders = `{${(_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a.map(f => f.uri.fsPath).join(',')}}`;
        return configured === null || configured === void 0 ? void 0 : configured.map(c => c.replace('${workspaceFolder}', allFolders)).map(pathUtils_1.forceForwardSlashes);
    }
    /**
     * Stores the bootloader in the storage path so that it doesn't change
     * location between the extension version updating.
     * @override
     */
    async getBootloaderFile(cwd, binary) {
        // Use the local bootloader in development mode for easier iteration
        // if (this.extensionContext.extensionMode === vscode.ExtensionMode.Development) {
        //   return super.getBootloaderFile(cwd, binary);
        // }
        var _a;
        const storagePath = this.extensionContext.storagePath || this.extensionContext.globalStoragePath;
        if (storagePath.includes(' ')) {
            if (!binary.isPreciselyKnown) {
                throw new AutoAttachPreconditionFailed('We did not find `node` on your PATH, so we cannot enable auto-attach in your environment', 'https://github.com/microsoft/vscode-js-debug/issues/708');
            }
            if (!binary.has(0 /* UseSpacesInRequirePath */)) {
                throw new AutoAttachPreconditionFailed(`The \`node\` version on your PATH is too old (${(_a = binary.version) === null || _a === void 0 ? void 0 : _a.major}), so we cannot enable auto-attach in your environment`, 'https://github.com/microsoft/vscode-js-debug/issues/708');
            }
        }
        const bootloaderPath = path.join(storagePath, 'bootloader.js');
        try {
            await this.fs.mkdir(storagePath);
        }
        catch (_b) {
            // already exists, most likely
        }
        await Promise.all([
            this.fs.copyFile(bundlePaths_1.bootloaderDefaultPath, bootloaderPath),
            this.fs.copyFile(bundlePaths_1.watchdogPath, path.join(storagePath, 'watchdog.bundle.js')),
        ]);
        const p = pathUtils_1.forceForwardSlashes(bootloaderPath);
        return { interpolatedPath: p.includes(' ') ? `"${p}"` : p, dispose: () => undefined };
    }
    /**
     * Spawns a watchdog for the child process to attach back to this server.
     */
    async spawnForChild(data) {
        var _a;
        if (!this.run) {
            return;
        }
        const pid = Number((_a = data.pid) !== null && _a !== void 0 ? _a : '0');
        this.telemetryItems.set(pid, data.telemetry);
        const wd = await watchdogSpawn_1.WatchDog.attach(Object.assign(Object.assign({}, data), { ipcAddress: this.run.serverAddress }));
        wd.onEnd(() => this.telemetryItems.delete(pid));
    }
    static clearVariables(context) {
        context.environmentVariableCollection.clear();
    }
};
AutoAttachLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(nodeBinaryProvider_1.INodeBinaryProvider)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(ioc_extras_1.ExtensionContext)),
    __param(3, inversify_1.inject(ioc_extras_1.FS)),
    __param(4, inversify_1.inject(sourcePathResolverFactory_1.ISourcePathResolverFactory)),
    __param(5, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker))
], AutoAttachLauncher);
exports.AutoAttachLauncher = AutoAttachLauncher;
class AutoAttachPreconditionFailed extends Error {
    constructor(message, helpLink) {
        super(message);
        this.helpLink = helpLink;
    }
}
exports.AutoAttachPreconditionFailed = AutoAttachPreconditionFailed;
//# sourceMappingURL=autoAttachLauncher.js.map
//# sourceMappingURL=autoAttachLauncher.js.map
