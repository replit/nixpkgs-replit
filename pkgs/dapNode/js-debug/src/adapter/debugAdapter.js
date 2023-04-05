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
exports.DebugAdapter = void 0;
const nls = __importStar(require("vscode-nls"));
const disposable_1 = require("../common/disposable");
const logging_1 = require("../common/logging");
const promiseUtil_1 = require("../common/promiseUtil");
const renameProvider_1 = require("../common/sourceMaps/renameProvider");
const sourceUtils = __importStar(require("../common/sourceUtils"));
const urlUtils = __importStar(require("../common/urlUtils"));
const errors = __importStar(require("../dap/errors"));
const ioc_extras_1 = require("../ioc-extras");
const telemetryReporter_1 = require("../telemetry/telemetryReporter");
const breakpoints_1 = require("./breakpoints");
const cdpProxy_1 = require("./cdpProxy");
const completions_1 = require("./completions");
const console_1 = require("./console");
const diagnosics_1 = require("./diagnosics");
const diagnosticToolSuggester_1 = require("./diagnosticToolSuggester");
const evaluator_1 = require("./evaluator");
const exceptionPauseService_1 = require("./exceptionPauseService");
const performance_1 = require("./performance");
const profileController_1 = require("./profileController");
const basicCpuProfiler_1 = require("./profiling/basicCpuProfiler");
const scriptSkipper_1 = require("./scriptSkipper/scriptSkipper");
const sources_1 = require("./sources");
const threads_1 = require("./threads");
const localize = nls.loadMessageBundle();
// This class collects configuration issued before "launch" request,
// to be applied after launch.
class DebugAdapter {
    constructor(dap, asyncStackPolicy, launchConfig, _services) {
        this.asyncStackPolicy = asyncStackPolicy;
        this.launchConfig = launchConfig;
        this._services = _services;
        this._disposables = new disposable_1.DisposableList();
        this._customBreakpoints = new Set();
        this.lastBreakpointId = 0;
        this._configurationDoneDeferred = promiseUtil_1.getDeferred();
        this.sourceContainer = _services.get(sources_1.SourceContainer);
        // It seems that the _onSetBreakpoints callback might be called while this method is being executed
        // so we initialize this before configuring the event handlers for the dap
        this.breakpointManager = _services.get(breakpoints_1.BreakpointManager);
        const performanceProvider = _services.get(performance_1.IPerformanceProvider);
        const telemetry = _services.get(telemetryReporter_1.ITelemetryReporter);
        telemetry.onFlush(() => {
            telemetry.report('breakpointStats', this.breakpointManager.statisticsForTelemetry());
            telemetry.report('statistics', this.sourceContainer.statistics());
        });
        this.dap = dap;
        this.dap.on('initialize', params => this._onInitialize(params));
        this.dap.on('setBreakpoints', params => this._onSetBreakpoints(params));
        this.dap.on('setExceptionBreakpoints', params => this.setExceptionBreakpoints(params));
        this.dap.on('configurationDone', () => this.configurationDone());
        this.dap.on('loadedSources', () => this._onLoadedSources());
        this.dap.on('disableSourcemap', params => this._onDisableSourcemap(params));
        this.dap.on('source', params => this._onSource(params));
        this.dap.on('threads', () => this._onThreads());
        this.dap.on('stackTrace', params => this._onStackTrace(params));
        this.dap.on('variables', params => this._onVariables(params));
        this.dap.on('setVariable', params => this._onSetVariable(params));
        this.dap.on('continue', () => this._withThread(thread => thread.resume()));
        this.dap.on('pause', () => this._withThread(thread => thread.pause()));
        this.dap.on('next', () => this._withThread(thread => thread.stepOver()));
        this.dap.on('stepIn', () => this._withThread(thread => thread.stepInto()));
        this.dap.on('stepOut', () => this._withThread(thread => thread.stepOut()));
        this.dap.on('restartFrame', params => this._withThread(thread => thread.restartFrame(params)));
        this.dap.on('scopes', params => this._withThread(thread => thread.scopes(params)));
        this.dap.on('evaluate', params => this._withThread(thread => thread.evaluate(params)));
        this.dap.on('completions', params => this._withThread(thread => thread.completions(params)));
        this.dap.on('exceptionInfo', () => this._withThread(thread => thread.exceptionInfo()));
        this.dap.on('enableCustomBreakpoints', params => this.enableCustomBreakpoints(params));
        this.dap.on('toggleSkipFileStatus', params => this._toggleSkipFileStatus(params));
        this.dap.on('disableCustomBreakpoints', params => this._disableCustomBreakpoints(params));
        this.dap.on('canPrettyPrintSource', params => this._canPrettyPrintSource(params));
        this.dap.on('prettyPrintSource', params => this._prettyPrintSource(params));
        this.dap.on('revealPage', () => this._withThread(thread => thread.revealPage()));
        this.dap.on('getPerformance', () => this._withThread(thread => performanceProvider.retrieve(thread.cdp())));
        this.dap.on('breakpointLocations', params => this._withThread(async (thread) => ({
            breakpoints: await this.breakpointManager.getBreakpointLocations(thread, params),
        })));
        this.dap.on('createDiagnostics', params => this._dumpDiagnostics(params));
        this.dap.on('requestCDPProxy', () => this._requestCDPProxy());
    }
    async launchBlocker() {
        await this._configurationDoneDeferred.promise;
        await this._services.get(exceptionPauseService_1.IExceptionPauseService).launchBlocker;
        await this.breakpointManager.launchBlocker();
    }
    async _onInitialize(params) {
        console.assert(params.linesStartAt1);
        console.assert(params.columnsStartAt1);
        const capabilities = DebugAdapter.capabilities();
        setTimeout(() => this.dap.initialized({}), 0);
        setTimeout(() => { var _a; return (_a = this._thread) === null || _a === void 0 ? void 0 : _a.dapInitialized(); }, 0);
        return capabilities;
    }
    static capabilities() {
        return {
            supportsConfigurationDoneRequest: true,
            supportsFunctionBreakpoints: false,
            supportsConditionalBreakpoints: true,
            supportsHitConditionalBreakpoints: true,
            supportsEvaluateForHovers: true,
            exceptionBreakpointFilters: [
                {
                    filter: "all" /* All */,
                    label: localize('breakpoint.caughtExceptions', 'Caught Exceptions'),
                    default: false,
                    supportsCondition: true,
                    description: localize('breakpoint.caughtExceptions.description', "Breaks on all throw errors, even if they're caught later."),
                    conditionDescription: `error.name == "MyError"`,
                },
                {
                    filter: "uncaught" /* Uncaught */,
                    label: localize('breakpoint.uncaughtExceptions', 'Uncaught Exceptions'),
                    default: false,
                    supportsCondition: true,
                    description: localize('breakpoint.caughtExceptions.description', 'Breaks only on errors or promise rejections that are not handled.'),
                    conditionDescription: `error.name == "MyError"`,
                },
            ],
            supportsStepBack: false,
            supportsSetVariable: true,
            supportsRestartFrame: true,
            supportsGotoTargetsRequest: false,
            supportsStepInTargetsRequest: false,
            supportsCompletionsRequest: true,
            supportsModulesRequest: false,
            additionalModuleColumns: [],
            supportedChecksumAlgorithms: [],
            supportsRestartRequest: true,
            supportsExceptionOptions: false,
            supportsValueFormattingOptions: true,
            supportsExceptionInfoRequest: true,
            supportTerminateDebuggee: false,
            supportsDelayedStackTraceLoading: true,
            supportsLoadedSourcesRequest: true,
            supportsLogPoints: true,
            supportsTerminateThreadsRequest: false,
            supportsSetExpression: false,
            supportsTerminateRequest: false,
            completionTriggerCharacters: ['.', '[', '"', "'"],
            supportsBreakpointLocationsRequest: true,
            supportsClipboardContext: true,
            supportsExceptionFilterOptions: true,
        };
    }
    async _onSetBreakpoints(params) {
        var _a, _b;
        return this.breakpointManager.setBreakpoints(params, (_b = (_a = params.breakpoints) === null || _a === void 0 ? void 0 : _a.map(() => ++this.lastBreakpointId)) !== null && _b !== void 0 ? _b : []);
    }
    async setExceptionBreakpoints(params) {
        await this._services.get(exceptionPauseService_1.IExceptionPauseService).setBreakpoints(params);
        return {};
    }
    async configurationDone() {
        this._configurationDoneDeferred.resolve();
        return {};
    }
    async _onLoadedSources() {
        return { sources: await this.sourceContainer.loadedSources() };
    }
    async _onDisableSourcemap(params) {
        var _a;
        const source = this.sourceContainer.source(params.source);
        if (!source) {
            return errors.createSilentError(localize('error.sourceNotFound', 'Source not found'));
        }
        if (!(source instanceof sources_1.SourceFromMap)) {
            return errors.createSilentError(localize('error.sourceNotFound', 'Source not a source map'));
        }
        for (const compiled of source.compiledToSourceUrl.keys()) {
            this.sourceContainer.disableSourceMapForSource(compiled, /* permanent= */ true);
        }
        await ((_a = this._thread) === null || _a === void 0 ? void 0 : _a.refreshStackTrace());
        return {};
    }
    async _onSource(params) {
        if (!params.source) {
            params.source = { sourceReference: params.sourceReference };
        }
        params.source.path = urlUtils.platformPathToPreferredCase(params.source.path);
        const source = this.sourceContainer.source(params.source);
        if (!source) {
            return errors.createSilentError(localize('error.sourceNotFound', 'Source not found'));
        }
        const content = await source.content();
        if (content === undefined) {
            if (source instanceof sources_1.SourceFromMap) {
                this.dap.suggestDisableSourcemap({ source: params.source });
            }
            return errors.createSilentError(localize('error.sourceContentDidFail', 'Unable to retrieve source content'));
        }
        return { content, mimeType: source.mimeType() };
    }
    async _onThreads() {
        const threads = [];
        if (this._thread)
            threads.push({ id: this._thread.id, name: this._thread.name() });
        return { threads };
    }
    async _onStackTrace(params) {
        if (!this._thread)
            return this._threadNotAvailableError();
        return this._thread.stackTrace(params);
    }
    _findVariableStore(variablesReference) {
        if (!this._thread)
            return;
        const pausedVariables = this._thread.pausedVariables();
        if (pausedVariables === null || pausedVariables === void 0 ? void 0 : pausedVariables.hasVariables(variablesReference))
            return pausedVariables;
        if (this._thread.replVariables.hasVariables(variablesReference))
            return this._thread.replVariables;
    }
    async _onVariables(params) {
        const variableStore = this._findVariableStore(params.variablesReference);
        if (!variableStore)
            return { variables: [] };
        return { variables: await variableStore.getVariables(params) };
    }
    async _onSetVariable(params) {
        const variableStore = this._findVariableStore(params.variablesReference);
        if (!variableStore)
            return errors.createSilentError(localize('error.variableNotFound', 'Variable not found'));
        params.value = sourceUtils.wrapObjectLiteral(params.value.trim());
        return variableStore.setVariable(params);
    }
    _withThread(callback) {
        if (!this._thread)
            return Promise.resolve(this._threadNotAvailableError());
        return callback(this._thread);
    }
    async _refreshStackTrace() {
        if (!this._thread)
            return;
        const details = this._thread.pausedDetails();
        if (details)
            await this._thread.refreshStackTrace();
    }
    _threadNotAvailableError() {
        return errors.createSilentError(localize('error.threadNotFound', 'Thread not found'));
    }
    createThread(cdp, delegate, initializeParams) {
        this._thread = new threads_1.Thread(this.sourceContainer, cdp, this.dap, delegate, this._services.get(renameProvider_1.IRenameProvider), this._services.get(logging_1.ILogger), this._services.get(evaluator_1.IEvaluator), this._services.get(completions_1.ICompletions), this.launchConfig, this.breakpointManager, this._services.get(console_1.IConsole), this._services.get(exceptionPauseService_1.IExceptionPauseService));
        if (initializeParams) {
            // We won't get notified of an initialize message:
            // that was already caught by the caller.
            setTimeout(() => {
                this._onInitialize(initializeParams);
            }, 0);
        }
        const profile = this._services.get(profileController_1.IProfileController);
        profile.connect(this.dap, this._thread);
        if ('profileStartup' in this.launchConfig && this.launchConfig.profileStartup) {
            profile.start(this.dap, this._thread, { type: basicCpuProfiler_1.BasicCpuProfiler.type });
        }
        for (const breakpoint of this._customBreakpoints)
            this._thread.updateCustomBreakpoint(breakpoint, true);
        this.asyncStackPolicy
            .connect(cdp)
            .then(d => this._disposables.push(d))
            .catch(err => this._services
            .get(logging_1.ILogger)
            .error("internal" /* Internal */, 'Error enabling async stacks', err));
        this.breakpointManager.setThread(this._thread);
        this._services.get(diagnosticToolSuggester_1.DiagnosticToolSuggester).attach(cdp);
        return this._thread;
    }
    async enableCustomBreakpoints(params) {
        const promises = [];
        for (const id of params.ids) {
            this._customBreakpoints.add(id);
            if (this._thread)
                promises.push(this._thread.updateCustomBreakpoint(id, true));
        }
        await Promise.all(promises);
        return {};
    }
    async _disableCustomBreakpoints(params) {
        const promises = [];
        for (const id of params.ids) {
            this._customBreakpoints.delete(id);
            if (this._thread)
                promises.push(this._thread.updateCustomBreakpoint(id, false));
        }
        await Promise.all(promises);
        return {};
    }
    async _toggleSkipFileStatus(params) {
        await this._services.get(scriptSkipper_1.IScriptSkipper).toggleSkippingFile(params);
        await this._refreshStackTrace();
        return {};
    }
    async _canPrettyPrintSource(params) {
        if (!params.source) {
            return { canPrettyPrint: false };
        }
        params.source.path = urlUtils.platformPathToPreferredCase(params.source.path);
        const source = this.sourceContainer.source(params.source);
        if (!source)
            return errors.createSilentError(localize('error.sourceNotFound', 'Source not found'));
        return { canPrettyPrint: source.canPrettyPrint() };
    }
    async _prettyPrintSource(params) {
        if (!params.source) {
            return { canPrettyPrint: false };
        }
        params.source.path = urlUtils.platformPathToPreferredCase(params.source.path);
        const source = this.sourceContainer.source(params.source);
        if (!source) {
            return errors.createSilentError(localize('error.sourceNotFound', 'Source not found'));
        }
        const prettified = await source.prettyPrint();
        if (!prettified) {
            return errors.createSilentError(localize('error.cannotPrettyPrint', 'Unable to pretty print'));
        }
        const { map: sourceMap, source: generated } = prettified;
        this.breakpointManager.moveBreakpoints(source, sourceMap, generated);
        this.sourceContainer.clearDisabledSourceMaps(source);
        await this._refreshStackTrace();
        return {};
    }
    async _dumpDiagnostics(params) {
        const out = { file: await this._services.get(diagnosics_1.Diagnostics).generateHtml() };
        if (params.fromSuggestion) {
            this._services
                .get(telemetryReporter_1.ITelemetryReporter)
                .report('diagnosticPrompt', { event: 'opened' });
        }
        return out;
    }
    async _requestCDPProxy() {
        return await this._services.get(cdpProxy_1.ICdpProxyProvider).proxy();
    }
    dispose() {
        this._disposables.dispose();
        ioc_extras_1.disposeContainer(this._services);
    }
}
exports.DebugAdapter = DebugAdapter;
//# sourceMappingURL=debugAdapter.js.map
//# sourceMappingURL=debugAdapter.js.map
