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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeLauncherBase = void 0;
const fs = __importStar(require("fs"));
const inversify_1 = require("inversify");
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const portLeaseTracker_1 = require("../../adapter/portLeaseTracker");
const templates_1 = require("../../adapter/templates");
const connection_1 = __importDefault(require("../../cdp/connection"));
const rawPipeTransport_1 = require("../../cdp/rawPipeTransport");
const workerTransport_1 = require("../../cdp/workerTransport");
const cancellation_1 = require("../../common/cancellation");
const observableMap_1 = require("../../common/datastructure/observableMap");
const disposable_1 = require("../../common/disposable");
const environmentVars_1 = require("../../common/environmentVars");
const events_1 = require("../../common/events");
const logging_1 = require("../../common/logging");
const objUtils_1 = require("../../common/objUtils");
const pathUtils_1 = require("../../common/pathUtils");
const promiseUtil_1 = require("../../common/promiseUtil");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const sourcePathResolverFactory_1 = require("../sourcePathResolverFactory");
const bundlePaths_1 = require("./bundlePaths");
const nodeBinaryProvider_1 = require("./nodeBinaryProvider");
const nodeTarget_1 = require("./nodeTarget");
const nodeWorkerTarget_1 = require("./nodeWorkerTarget");
let counter = 0;
let NodeLauncherBase = class NodeLauncherBase {
    constructor(pathProvider, logger, portLeaseTracker, pathResolverFactory) {
        this.pathProvider = pathProvider;
        this.logger = logger;
        this.portLeaseTracker = portLeaseTracker;
        this.pathResolverFactory = pathResolverFactory;
        /**
         * Attached server connections. Tracked so they can be torn down readily.
         */
        this.serverConnections = new Set();
        /**
         * Target list.
         */
        this.targets = new observableMap_1.ObservableMap();
        /**
         * Underlying emitter fired when sessions terminate. Listened to by the
         * binder and used to trigger a `terminate` message on the DAP.
         */
        this.onTerminatedEmitter = new events_1.EventEmitter();
        /**
         * @inheritdoc
         */
        this.onTerminated = this.onTerminatedEmitter.event;
        /**
         * @inheritdoc
         */
        this.onTargetListChanged = this.targets.onChanged;
        /**
         * Bootloader file, if created.
         */
        this.bootloaderFile = objUtils_1.once(this.getBootloaderFile.bind(this));
    }
    /**
     * @inheritdoc
     */
    async launch(params, context) {
        const resolved = this.resolveParams(params);
        if (!resolved) {
            return { blockSessionTermination: false };
        }
        this._stopServer(); // clear any ongoing run
        const { server, pipe } = await this._startServer(context.telemetryReporter);
        const logger = this.logger.forTarget();
        const run = (this.run = {
            server,
            serverAddress: pipe,
            params: resolved,
            context,
            logger,
            pathResolver: this.pathResolverFactory.create(resolved, this.logger),
        });
        await this.launchProgram(run);
        return { blockSessionTermination: true };
    }
    /**
     * @inheritdoc
     */
    async terminate() {
        if (this.program) {
            await this.program.stop();
        }
        else {
            this.onProgramTerminated({ code: 0, killed: true });
        }
    }
    /**
     * @inheritdoc
     */
    async disconnect() {
        await this.terminate();
    }
    /**
     * Restarts the ongoing program.
     */
    async restart(newParams) {
        var _a;
        if (!this.run) {
            return;
        }
        // Clear the program so that termination logic doesn't run.
        const program = this.program;
        if (program) {
            this.program = undefined;
            await program.stop();
            const closeOk = await Promise.race([
                promiseUtil_1.delay(2000).then(() => false),
                Promise.all([...this.serverConnections].map(c => new Promise(r => c.onDisconnected(r)))),
            ]);
            if (!closeOk) {
                this.logger.warn("runtime.launch" /* RuntimeLaunch */, 'Timeout waiting for server connections to close');
                this.closeAllConnections();
            }
        }
        // relaunch the program, releasing the initial cancellation token:
        const cts = cancellation_1.CancellationTokenSource.withTimeout(this.run.params.timeout);
        await this.launchProgram(Object.assign(Object.assign({}, this.run), { params: newParams ? (_a = this.resolveParams(newParams)) !== null && _a !== void 0 ? _a : this.run.params : this.run.params, context: Object.assign(Object.assign({}, this.run.context), { cancellationToken: cts.token }) }));
    }
    targetList() {
        return [...this.targets.value()];
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this._stopServer();
    }
    /**
     * Method that should be called when the program from launchProgram() exits.
     * Emits a stop to the client and tears down the server.
     */
    onProgramTerminated(result) {
        this.onTerminatedEmitter.fire(result);
        this._stopServer();
        this.program = undefined;
    }
    /**
     * Resolves and validates the path to the Node binary as specified in
     * the params.
     */
    resolveNodePath(params, executable = 'node') {
        return this.pathProvider.resolveAndValidate(environmentVars_1.EnvironmentVars.merge(environmentVars_1.EnvironmentVars.processEnv(), this.getConfiguredEnvironment(params)), executable, params.nodeVersionHint);
    }
    /**
     * Returns the user-configured portion of the environment variables.
     */
    getConfiguredEnvironment(params) {
        let baseEnv = environmentVars_1.EnvironmentVars.empty;
        // read environment variables from any specified file
        if (params.envFile) {
            try {
                baseEnv = baseEnv.merge(readEnvFile(params.envFile));
            }
            catch (e) {
                throw new protocolError_1.ProtocolError(errors_1.cannotLoadEnvironmentVars(e.message));
            }
        }
        return baseEnv.merge(params.env);
    }
    /**
     * Gets the environment variables for the session.
     */
    async resolveEnvironment({ params, serverAddress }, binary, additionalOptions) {
        const baseEnv = this.getConfiguredEnvironment(params);
        const bootloader = await this.bootloaderFile(params.cwd, binary);
        const bootloaderInfo = Object.assign({ inspectorIpc: serverAddress, deferredMode: false, 
            // todo: look at reimplementing the filter
            // NODE_INSPECTOR_WAIT_FOR_DEBUGGER: this._launchParams!.nodeFilter || '',
            waitForDebugger: '', 
            // Supply some node executable for running top-level watchdog in Electron
            // environments. Bootloader will replace this with actual node executable used if any.
            execPath: await pathUtils_1.findInPath(fs.promises, 'node', process.env), onlyEntrypoint: !params.autoAttachChildProcesses, autoAttachMode: "always" /* Always */, mandatePortTracking: this.portLeaseTracker.isMandated ? true : undefined }, additionalOptions);
        const env = {
            // Require our bootloader first, to run it before any other bootloader
            // we could have injected in the parent process.
            NODE_OPTIONS: `--require ${bootloader.interpolatedPath}`,
            VSCODE_INSPECTOR_OPTIONS: JSON.stringify(bootloaderInfo),
            ELECTRON_RUN_AS_NODE: null,
        };
        const baseEnvOpts = baseEnv.lookup('NODE_OPTIONS');
        if (baseEnvOpts) {
            env.NODE_OPTIONS += ` ${baseEnvOpts}`;
        }
        const globalOpts = environmentVars_1.EnvironmentVars.processEnv().lookup('NODE_OPTIONS');
        if (globalOpts) {
            env.NODE_OPTIONS += ` ${globalOpts}`;
        }
        return baseEnv.merge(Object.assign({}, env));
    }
    /**
     * Logic run when a thread is created.
     */
    createLifecycle(
    // eslint-disable-next-line
    _cdp, 
    // eslint-disable-next-line
    _run, 
    // eslint-disable-next-line
    _target) {
        return {};
    }
    async _startServer(telemetryReporter) {
        const pipePrefix = process.platform === 'win32' ? '\\\\.\\pipe\\' : os.tmpdir();
        const pipe = path.join(pipePrefix, `node-cdp.${process.pid}-${++counter}.sock`);
        const server = await new Promise((resolve, reject) => {
            const s = net
                .createServer(socket => this._startSession(socket, telemetryReporter))
                .on('error', reject)
                .listen(pipe, () => resolve(s));
        });
        return { pipe, server };
    }
    _stopServer() {
        var _a, _b;
        (_a = this.run) === null || _a === void 0 ? void 0 : _a.server.close();
        this.run = undefined;
        (_b = this.bootloaderFile.value) === null || _b === void 0 ? void 0 : _b.then(f => f.dispose());
        this.bootloaderFile.forget();
        this.closeAllConnections();
    }
    closeAllConnections() {
        this.serverConnections.forEach(c => c.close());
        this.serverConnections.clear();
    }
    async _startSession(socket, telemetryReporter) {
        if (!this.run) {
            return;
        }
        const { connection, cdp, targetInfo } = await this.acquireTarget(socket, telemetryReporter, this.run.logger);
        if (!this.run) {
            // if we aren't running a session, discard the socket.
            socket.destroy();
            return;
        }
        if (targetInfo.processId === undefined) {
            targetInfo.processId = Number(targetInfo.targetId); // old bootloaders
        }
        const target = new nodeTarget_1.NodeTarget(this.run.params, this.run.pathResolver, this.run.context.targetOrigin, connection, cdp, targetInfo, this.run.logger, this.createLifecycle(cdp, this.run, targetInfo), targetInfo.openerId ? this.targets.get(targetInfo.openerId) : undefined);
        this.listenToWorkerDomain(cdp, telemetryReporter, target);
        this.targets.add(targetInfo.targetId, target);
        target.onDisconnect(() => this.targets.remove(targetInfo.targetId));
    }
    async listenToWorkerDomain(cdp, telemetryReporter, parent) {
        cdp.NodeWorker.on('attachedToWorker', evt => {
            const transport = new workerTransport_1.WorkerTransport(evt.sessionId, cdp);
            const target = new nodeWorkerTarget_1.NodeWorkerTarget(parent.launchConfig, {
                attached: true,
                canAccessOpener: false,
                type: 'node-worker',
                targetId: `${parent.id()}-${evt.sessionId}`,
                title: evt.workerInfo.title,
                url: evt.workerInfo.url,
                openerId: parent.id(),
            }, parent, parent.targetOrigin(), new connection_1.default(transport, parent.logger, telemetryReporter).rootSession(), parent.sourcePathResolver(), parent.logger);
            const disposables = new disposable_1.DisposableList();
            disposables.push(transport);
            disposables.push(parent.onDisconnect(() => disposables.dispose()));
            disposables.push(transport.onEnd(() => disposables.dispose()));
            disposables.callback(() => this.targets.remove(target.id()));
            this.targets.add(target.id(), target);
        });
    }
    /**
     * Acquires the CDP session and target info from the connecting socket.
     */
    async acquireTarget(socket, rawTelemetryReporter, logger) {
        const connection = new connection_1.default(new rawPipeTransport_1.RawPipeTransport(logger, socket), logger, rawTelemetryReporter);
        this.serverConnections.add(connection);
        connection.onDisconnected(() => this.serverConnections.delete(connection));
        const cdp = connection.rootSession();
        const { targetInfo } = await new Promise(f => cdp.Target.on('targetCreated', f));
        const cast = targetInfo;
        const portLease = this.portLeaseTracker.register(cast.processInspectorPort);
        connection.onDisconnected(() => portLease.dispose());
        return {
            targetInfo: cast,
            cdp,
            connection,
            logger,
        };
    }
    /**
     * Returns the file from which to load our bootloader. We need to do this in
     * since Node does not support paths with spaces in them < 13 (nodejs/node#12971),
     * so if our installation path has spaces, we need to fall back somewhere.
     */
    async getBootloaderFile(cwd, binary) {
        const targetPath = pathUtils_1.forceForwardSlashes(bundlePaths_1.bootloaderDefaultPath);
        // 1. If the path doesn't have a space, we're OK to use it.
        if (!targetPath.includes(' ')) {
            return { interpolatedPath: targetPath, dispose: () => undefined };
        }
        // 1.5. If we can otherwise use spaces in the path, quote and return it.
        if (binary.has(0 /* UseSpacesInRequirePath */)) {
            return { interpolatedPath: `"${targetPath}"`, dispose: () => undefined };
        }
        // 2. Try the tmpdir, if it's space-free.
        const contents = `require(${JSON.stringify(targetPath)})`;
        if (!os.tmpdir().includes(' ') || !cwd) {
            const tmpPath = path.join(os.tmpdir(), 'vscode-js-debug-bootloader.js');
            await fs.promises.writeFile(tmpPath, contents);
            return { interpolatedPath: tmpPath, dispose: () => undefined };
        }
        // 3. Worst case, write into the cwd. This is messy, but we have few options.
        const nearFilename = '.vscode-js-debug-bootloader.js';
        const nearPath = path.join(cwd, nearFilename);
        await fs.promises.writeFile(nearPath, contents);
        return {
            interpolatedPath: `./${nearFilename}`,
            dispose: () => fs.unlinkSync(nearPath),
        };
    }
    /**
     * Reads telemetry from the process.
     */
    async gatherTelemetryFromCdp(cdp, run) {
        for (let retries = 0; retries < 5; retries++) {
            const telemetry = await cdp.Runtime.evaluate({
                contextId: 1,
                returnByValue: true,
                // note: for some bizarre reason, if launched with --inspect-brk, the
                // process.pid in extension host debugging is initially undefined.
                expression: `typeof process === 'undefined' || process.pid === undefined ? 'process not defined' : ({ processId: process.pid, nodeVersion: process.version, architecture: process.arch })` +
                    templates_1.getSourceSuffix(),
            });
            if (!this.program) {
                return; // shut down
            }
            if (!telemetry || !telemetry.result.value) {
                this.logger.error("runtime.target" /* RuntimeTarget */, 'Undefined result getting telemetry');
                return;
            }
            if (typeof telemetry.result.value !== 'object') {
                this.logger.info("runtime.target" /* RuntimeTarget */, 'Process not yet defined, will retry');
                await promiseUtil_1.delay(20);
                continue;
            }
            const result = telemetry.result.value;
            run.context.telemetryReporter.report('nodeRuntime', {
                version: result.nodeVersion,
                arch: result.architecture,
            });
            this.program.gotTelemetery(result);
            return result;
        }
        return undefined;
    }
};
NodeLauncherBase = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(nodeBinaryProvider_1.INodeBinaryProvider)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker)),
    __param(3, inversify_1.inject(sourcePathResolverFactory_1.ISourcePathResolverFactory))
], NodeLauncherBase);
exports.NodeLauncherBase = NodeLauncherBase;
function readEnvFile(file) {
    if (!fs.existsSync(file)) {
        return {};
    }
    const buffer = stripBOM(fs.readFileSync(file, 'utf8'));
    const env = {};
    for (const line of buffer.split('\n')) {
        const r = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (!r) {
            continue;
        }
        let value = r[2] || '';
        // .env variables never overwrite existing variables (see #21169)
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
            value = value.replace(/\\n/gm, '\n');
        }
        env[r[1]] = value.replace(/(^['"]|['"]$)/g, '');
    }
    return env;
}
function stripBOM(s) {
    if (s && s[0] === '\uFEFF') {
        s = s.substr(1);
    }
    return s;
}
//# sourceMappingURL=nodeLauncherBase.js.map
//# sourceMappingURL=nodeLauncherBase.js.map
