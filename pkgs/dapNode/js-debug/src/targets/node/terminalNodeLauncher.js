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
exports.TerminalNodeLauncher = void 0;
const crypto_1 = require("crypto");
const inversify_1 = require("inversify");
const os_1 = require("os");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const portLeaseTracker_1 = require("../../adapter/portLeaseTracker");
const events_1 = require("../../common/events");
const logging_1 = require("../../common/logging");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const sourcePathResolverFactory_1 = require("../sourcePathResolverFactory");
const nodeBinaryProvider_1 = require("./nodeBinaryProvider");
const nodeLauncherBase_1 = require("./nodeLauncherBase");
class VSCodeTerminalProcess {
    constructor(terminal) {
        this.terminal = terminal;
        this.stopped = new Promise(resolve => {
            const disposable = vscode.window.onDidCloseTerminal(t => {
                if (t === terminal) {
                    resolve({ code: 0, killed: true });
                    disposable.dispose();
                }
            });
        });
    }
    gotTelemetery() {
        // no-op
    }
    stop() {
        // send ctrl+c to sigint any running processs (vscode/#108289)
        this.terminal.sendText('\x03');
        // and then destroy it on the next event loop tick
        setTimeout(() => this.terminal.dispose(), 1);
        return this.stopped;
    }
}
/**
 * A special launcher which only opens a vscode terminal. Used for the
 * "debugger terminal" in the extension.
 */
let TerminalNodeLauncher = class TerminalNodeLauncher extends nodeLauncherBase_1.NodeLauncherBase {
    constructor(pathProvider, logger, fs, pathResolverFactory, portLeaseTracker) {
        super(pathProvider, logger, portLeaseTracker, pathResolverFactory);
        this.fs = fs;
        this.terminalCreatedEmitter = new events_1.EventEmitter();
        this.callbackFile = path.join(os_1.tmpdir(), `node-debug-callback-${crypto_1.randomBytes(8).toString('hex')}`);
        this.onTerminalCreated = this.terminalCreatedEmitter.event;
    }
    /**
     * Gets telemetry of the last-started process.
     */
    async getProcessTelemetry() {
        try {
            return JSON.parse(await this.fs.readFile(this.callbackFile, 'utf-8'));
        }
        catch (_a) {
            return undefined;
        }
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        if (params.type === "node-terminal" /* Terminal */ && params.request === 'launch') {
            return params;
        }
        if (params.type === "pwa-chrome" /* Chrome */ && params.server && 'command' in params.server) {
            return params.server;
        }
        return undefined;
    }
    /**
     * Launches the program.
     */
    async launchProgram(runData) {
        // Make sure that, if we can _find_ a in their path, it's the right
        // version so that we don't mysteriously never connect fail.
        let binary;
        try {
            binary = await this.resolveNodePath(runData.params);
        }
        catch (err) {
            if (err instanceof protocolError_1.ProtocolError && err.cause.id === 9230 /* NodeBinaryOutOfDate */) {
                throw err;
            }
            else {
                binary = new nodeBinaryProvider_1.NodeBinary('node', undefined);
            }
        }
        const env = await this.resolveEnvironment(runData, binary, {
            fileCallback: this.callbackFile,
        });
        const terminal = vscode.window.createTerminal({
            name: runData.params.name,
            cwd: runData.params.cwd,
            env: nodeBinaryProvider_1.hideDebugInfoFromConsole(binary, env).defined(),
        });
        this.terminalCreatedEmitter.fire(terminal);
        terminal.show();
        const program = (this.program = new VSCodeTerminalProcess(terminal));
        if (runData.params.command) {
            terminal.sendText(runData.params.command, true);
        }
        program.stopped.then(result => {
            if (program === this.program) {
                this.onProgramTerminated(result);
            }
        });
    }
    /**
     * @inheritdoc
     */
    dispose() {
        super.dispose();
        this.fs.unlink(this.callbackFile).catch(() => undefined);
    }
};
TerminalNodeLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(nodeBinaryProvider_1.INodeBinaryProvider)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(ioc_extras_1.FS)),
    __param(3, inversify_1.inject(sourcePathResolverFactory_1.ISourcePathResolverFactory)),
    __param(4, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker))
], TerminalNodeLauncher);
exports.TerminalNodeLauncher = TerminalNodeLauncher;
//# sourceMappingURL=terminalNodeLauncher.js.map
//# sourceMappingURL=terminalNodeLauncher.js.map
