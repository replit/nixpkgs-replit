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
exports.Binder = void 0;
const os = __importStar(require("os"));
const nls = __importStar(require("vscode-nls"));
const asyncStackPolicy_1 = require("./adapter/asyncStackPolicy");
const debugAdapter_1 = require("./adapter/debugAdapter");
const diagnosticToolSuggester_1 = require("./adapter/diagnosticToolSuggester");
const selfProfile_1 = require("./adapter/selfProfile");
const cancellation_1 = require("./common/cancellation");
const events_1 = require("./common/events");
const logging_1 = require("./common/logging");
const mutableLaunchConfig_1 = require("./common/mutableLaunchConfig");
const objUtils_1 = require("./common/objUtils");
const promiseUtil_1 = require("./common/promiseUtil");
const urlUtils = __importStar(require("./common/urlUtils"));
const configuration_1 = require("./configuration");
const protocolError_1 = require("./dap/protocolError");
const ioc_1 = require("./ioc");
const ioc_extras_1 = require("./ioc-extras");
const targets_1 = require("./targets/targets");
const telemetryReporter_1 = require("./telemetry/telemetryReporter");
const unhandledErrorReporter_1 = require("./telemetry/unhandledErrorReporter");
const localize = nls.loadMessageBundle();
class Binder {
    constructor(delegate, connection, _rootServices, targetOrigin) {
        this._rootServices = _rootServices;
        this._threads = new Map();
        this._terminationCount = 0;
        this._onTargetListChangedEmitter = new events_1.EventEmitter();
        this.onTargetListChanged = this._onTargetListChangedEmitter.event;
        this._serviceTree = new WeakMap();
        this._delegate = delegate;
        this._dap = connection.dap();
        this._targetOrigin = targetOrigin;
        this._disposables = [
            this._onTargetListChangedEmitter,
            unhandledErrorReporter_1.installUnhandledErrorReporter(_rootServices.get(logging_1.ILogger), _rootServices.get(telemetryReporter_1.ITelemetryReporter), _rootServices.get(ioc_extras_1.IsVSCode)),
        ];
        connection.attachTelemetry(_rootServices.get(telemetryReporter_1.ITelemetryReporter));
        this._dap.then(dap => {
            let lastBreakpointId = 0;
            let selfProfile;
            dap.on('initialize', async (clientCapabilities) => {
                this._rootServices.bind(ioc_extras_1.IInitializeParams).toConstantValue(clientCapabilities);
                const capabilities = debugAdapter_1.DebugAdapter.capabilities();
                if (clientCapabilities.clientID === 'vscode') {
                    unhandledErrorReporter_1.filterErrorsReportedToTelemetry();
                }
                this._dapInitializeParams = clientCapabilities;
                setTimeout(() => {
                    dap.initialized({});
                }, 0);
                return capabilities;
            });
            dap.on('setExceptionBreakpoints', async () => ({}));
            dap.on('setBreakpoints', async (params) => {
                var _a, _b, _c;
                if ((_a = params.breakpoints) === null || _a === void 0 ? void 0 : _a.length) {
                    _rootServices.get(diagnosticToolSuggester_1.DiagnosticToolSuggester).notifyHadBreakpoint();
                }
                return {
                    breakpoints: (_c = (_b = params.breakpoints) === null || _b === void 0 ? void 0 : _b.map(() => ({
                        id: ++lastBreakpointId,
                        verified: false,
                        message: localize('breakpoint.provisionalBreakpoint', `Unbound breakpoint`),
                    }))) !== null && _c !== void 0 ? _c : [],
                }; // TODO: Put a useful message here
            });
            dap.on('configurationDone', async () => ({}));
            dap.on('threads', async () => ({ threads: [] }));
            dap.on('loadedSources', async () => ({ sources: [] }));
            dap.on('breakpointLocations', () => Promise.resolve({ breakpoints: [] }));
            dap.on('attach', params => this._boot(configuration_1.applyDefaults(params, this._rootServices.get(ioc_extras_1.ExtensionLocation)), dap));
            dap.on('launch', params => {
                return this._boot(configuration_1.applyDefaults(params, this._rootServices.get(ioc_extras_1.ExtensionLocation)), dap);
            });
            dap.on('pause', async () => {
                return {};
            });
            dap.on('terminate', async () => {
                await this._disconnect();
                return {};
            });
            dap.on('disconnect', async () => {
                await this._disconnect();
                return {};
            });
            dap.on('restart', async ({ arguments: params }) => {
                await this._restart(params);
                return {};
            });
            dap.on('startSelfProfile', async ({ file }) => {
                selfProfile === null || selfProfile === void 0 ? void 0 : selfProfile.dispose();
                selfProfile = new selfProfile_1.SelfProfile(file);
                await selfProfile.start();
                return {};
            });
            dap.on('stopSelfProfile', async () => {
                if (selfProfile) {
                    await selfProfile.stop();
                    selfProfile.dispose();
                    selfProfile = undefined;
                }
                return {};
            });
        });
    }
    getLaunchers() {
        if (!this._launchers) {
            this._launchers = new Set(this._rootServices.getAll(targets_1.ILauncher));
            for (const launcher of this._launchers) {
                launcher.onTargetListChanged(() => {
                    const targets = this.targetList();
                    this._attachToNewTargets(targets, launcher);
                    this._detachOrphanThreads(targets);
                    this._onTargetListChangedEmitter.fire();
                }, undefined, this._disposables);
            }
        }
        return this._launchers;
    }
    async _disconnect() {
        if (!this._launchers) {
            return;
        }
        this._rootServices.get(telemetryReporter_1.ITelemetryReporter).flush();
        await Promise.all([...this._launchers].map(l => l.disconnect()));
        const didTerminate = () => !this.targetList.length && this._terminationCount === 0;
        if (didTerminate()) {
            return;
        }
        await new Promise(resolve => this.onTargetListChanged(() => {
            if (didTerminate()) {
                resolve();
            }
        }));
        await promiseUtil_1.delay(0); // next task so that we're sure terminated() sent
    }
    async _boot(params, dap) {
        warnNightly(dap);
        this.reportBootTelemetry(params);
        ioc_1.provideLaunchParams(this._rootServices, params, dap);
        this._rootServices.get(logging_1.ILogger).setup(logging_1.resolveLoggerOptions(dap, params.trace));
        const cts = params.timeout > 0
            ? cancellation_1.CancellationTokenSource.withTimeout(params.timeout)
            : new cancellation_1.CancellationTokenSource();
        if (params.rootPath)
            params.rootPath = urlUtils.platformPathToPreferredCase(params.rootPath);
        this._launchParams = params;
        try {
            await Promise.all([...this.getLaunchers()].map(l => this._launch(l, params, cts.token)));
        }
        catch (e) {
            if (e instanceof protocolError_1.ProtocolError) {
                e.cause.showUser = false; // avoid duplicate error messages in the UI
            }
            throw e;
        }
        return {};
    }
    reportBootTelemetry(rawParams) {
        const defaults = configuration_1.applyDefaults({
            type: rawParams.type,
            request: rawParams.request,
            name: '<string>',
            __workspaceFolder: '<workspace>',
        });
        // Sanitization function that strips non-default strings from the launch
        // config, to avoid unnecessarily collecting information about the workspace.
        const sanitizer = (value, key) => {
            if (typeof value === 'string') {
                return key && defaults[key] === value ? value : `<string>`;
            }
            if (value instanceof Array) {
                return value.map(v => sanitizer(v));
            }
            if (value && typeof value === 'object') {
                return objUtils_1.mapValues(value, v => sanitizer(v));
            }
            return value;
        };
        this._rootServices.get(telemetryReporter_1.ITelemetryReporter).report('launch', {
            type: rawParams.type,
            request: rawParams.request,
            os: `${os.platform()} ${os.arch()}`,
            nodeVersion: process.version,
            adapterVersion: configuration_1.packageVersion,
            parameters: objUtils_1.mapValues(rawParams, sanitizer),
        });
    }
    async _restart(newParams) {
        let resolved;
        if (newParams) {
            const currentParams = this._rootServices.get(mutableLaunchConfig_1.MutableLaunchConfig);
            resolved = configuration_1.applyDefaults(Object.assign({ __workspaceFolder: currentParams.__workspaceFolder }, newParams), this._rootServices.get(ioc_extras_1.ExtensionLocation));
            currentParams.update(resolved);
        }
        await Promise.all([...this.getLaunchers()].map(l => l.restart(resolved)));
    }
    async _launch(launcher, params, cancellationToken) {
        const result = await this.captureLaunch(launcher, params, cancellationToken);
        if (!result.blockSessionTermination) {
            return;
        }
        ++this._terminationCount;
        const listener = launcher.onTerminated(result => {
            listener.dispose();
            const detach = this._detachOrphanThreads(this.targetList(), { restart: result.restart });
            --this._terminationCount;
            this._onTargetListChangedEmitter.fire();
            if (!this._terminationCount) {
                detach.then(() => this._dap).then(dap => dap.terminated({ restart: result.restart }));
            }
        });
        this._disposables.push(listener);
    }
    /**
     * Launches the debug target, returning any the resolved result. Does a
     * bunch of mangling to log things, catch uncaught errors,
     * and format timeouts correctly.
     */
    async captureLaunch(launcher, params, cancellationToken) {
        const name = launcher.constructor.name;
        let result;
        try {
            result = await launcher.launch(params, {
                telemetryReporter: this._rootServices.get(telemetryReporter_1.ITelemetryReporter),
                cancellationToken,
                targetOrigin: this._targetOrigin,
                dap: await this._dap,
            });
        }
        catch (e) {
            this._rootServices.get(logging_1.ILogger).warn("runtime.launch" /* RuntimeLaunch */, 'Launch returned error', {
                error: e,
                wasCancelled: cancellationToken.isCancellationRequested,
                name,
            });
            throw e;
        }
        if (result.blockSessionTermination) {
            this._rootServices
                .get(logging_1.ILogger)
                .info("runtime.launch" /* RuntimeLaunch */, 'Launched successfully', { name });
        }
        return result;
    }
    dispose() {
        for (const disposable of this._disposables)
            disposable.dispose();
        this._disposables = [];
        ioc_extras_1.disposeContainer(this._rootServices);
        this._detachOrphanThreads([]);
    }
    targetList() {
        const result = [];
        for (const delegate of this.getLaunchers()) {
            result.push(...delegate.targetList());
        }
        return result;
    }
    async attach(target, threadData, launcher) {
        if (!this._launchParams) {
            throw new Error('Cannot launch before params have been set');
        }
        if (!target.canAttach()) {
            return;
        }
        const cdp = await target.attach();
        if (!cdp) {
            return;
        }
        const connection = await this._delegate.acquireDap(target);
        const dap = await connection.dap();
        const launchParams = this._launchParams;
        if (!this._asyncStackPolicy) {
            this._asyncStackPolicy = asyncStackPolicy_1.getAsyncStackPolicy(launchParams.showAsyncStacks);
        }
        const parentTarget = target.parent();
        const parentContainer = (parentTarget && this._serviceTree.get(parentTarget)) || this._rootServices;
        const container = ioc_1.createTargetContainer(parentContainer, target, dap, cdp);
        connection.attachTelemetry(container.get(telemetryReporter_1.ITelemetryReporter));
        this._serviceTree.set(target, parentContainer);
        // todo: move scriptskipper into services collection
        const debugAdapter = new debugAdapter_1.DebugAdapter(dap, this._asyncStackPolicy, launchParams, container);
        const thread = debugAdapter.createThread(cdp, target, this._dapInitializeParams);
        const startThread = async () => {
            await debugAdapter.launchBlocker();
            target.runIfWaitingForDebugger();
            threadData.resolve({ thread, debugAdapter });
            return {};
        };
        if (await this._delegate.initAdapter(debugAdapter, target, launcher)) {
            startThread();
        }
        else {
            dap.on('attach', startThread);
            dap.on('launch', startThread);
            dap.on('disconnect', () => this.detachTarget(target, container));
            dap.on('terminate', () => this.stopTarget(target, container));
            dap.on('restart', async () => {
                if (target.canRestart())
                    target.restart();
                else
                    await this._restart();
                return {};
            });
        }
        await target.afterBind();
    }
    /**
     * Called when we get a disconnect for a target. We stop the
     * specific target if we can, otherwise we just tear down the session.
     */
    async detachTarget(target, container) {
        container.get(telemetryReporter_1.ITelemetryReporter).flush();
        if (!this.targetList().includes(target)) {
            return {};
        }
        if (target.canDetach()) {
            await target.detach();
            this._releaseTarget(target);
        }
        else {
            this._disconnect();
        }
        return {};
    }
    /**
     * Called when we get a terminate for a target. We stop the
     * specific target if we can, otherwise we just tear down the session.
     */
    stopTarget(target, container) {
        container.get(telemetryReporter_1.ITelemetryReporter).flush();
        if (!this.targetList().includes(target)) {
            return Promise.resolve({});
        }
        if (target.canStop()) {
            target.stop();
        }
        else {
            this._disconnect();
        }
        return Promise.resolve({});
    }
    _attachToNewTargets(targets, launcher) {
        for (const target of targets.values()) {
            if (!target.waitingForDebugger()) {
                continue;
            }
            if (!this._threads.has(target)) {
                const threadData = promiseUtil_1.getDeferred();
                this._threads.set(target, threadData);
                this.attach(target, threadData, launcher);
            }
        }
    }
    async _detachOrphanThreads(targets, terminateArgs) {
        await Promise.all([...this._threads.keys()]
            .filter(target => !targets.includes(target))
            .map(target => this._releaseTarget(target, terminateArgs)));
    }
    async _releaseTarget(target, terminateArgs = {}) {
        const data = this._threads.get(target);
        if (!data)
            return;
        this._threads.delete(target);
        const threadData = await data.promise;
        await threadData.thread.dispose();
        threadData.debugAdapter.dap.terminated(terminateArgs);
        threadData.debugAdapter.dispose();
        this._delegate.releaseDap(target);
    }
}
exports.Binder = Binder;
function warnNightly(dap) {
    if (configuration_1.isNightly) {
        dap.output({
            category: 'console',
            output: `Note: Using the "preview" debug extension\n`,
        });
    }
}
//# sourceMappingURL=binder.js.map
//# sourceMappingURL=binder.js.map
