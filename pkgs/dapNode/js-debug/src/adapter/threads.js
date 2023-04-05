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
exports.Thread = exports.ExecutionContext = void 0;
const nls = __importStar(require("vscode-nls"));
const events_1 = require("../common/events");
const hrnow_1 = require("../common/hrnow");
const positions_1 = require("../common/positions");
const promiseUtil_1 = require("../common/promiseUtil");
const sourceUtils = __importStar(require("../common/sourceUtils"));
const urlUtils = __importStar(require("../common/urlUtils"));
const urlUtils_1 = require("../common/urlUtils");
const errors = __importStar(require("../dap/errors"));
const ProtocolError = __importStar(require("../dap/protocolError"));
const userDefinedBreakpoint_1 = require("./breakpoints/userDefinedBreakpoint");
const console_1 = require("./console");
const customBreakpoints_1 = require("./customBreakpoints");
const objectPreview = __importStar(require("./objectPreview"));
const smartStepping_1 = require("./smartStepping");
const sources_1 = require("./sources");
const stackTrace_1 = require("./stackTrace");
const serializeForClipboard_1 = require("./templates/serializeForClipboard");
const variables_1 = require("./variables");
const localize = nls.loadMessageBundle();
class ExecutionContext {
    constructor(thread, description) {
        this.thread = thread;
        this.description = description;
    }
    isDefault() {
        return this.description.auxData && this.description.auxData['isDefault'];
    }
}
exports.ExecutionContext = ExecutionContext;
class DeferredContainer {
    constructor(_obj) {
        this._obj = _obj;
        this._dapDeferred = promiseUtil_1.getDeferred();
    }
    resolve() {
        this._dapDeferred.resolve(this._obj);
    }
    with(callback) {
        if (this._dapDeferred.hasSettled()) {
            return callback(this._obj);
        }
        else {
            return this._dapDeferred.promise.then(obj => callback(obj));
        }
    }
}
class Thread {
    constructor(sourceContainer, cdp, dap, delegate, renameProvider, logger, evaluator, completer, launchConfig, _breakpointManager, console, exceptionPause) {
        this.logger = logger;
        this.evaluator = evaluator;
        this.completer = completer;
        this.launchConfig = launchConfig;
        this._breakpointManager = _breakpointManager;
        this.console = console;
        this.exceptionPause = exceptionPause;
        this._executionContexts = new Map();
        // url => (hash => Source)
        this._scriptSources = new Map();
        this._sourceMapLoads = new Map();
        this._sourceScripts = new WeakMap();
        this._pausedDetailsEvent = new WeakMap();
        this._onPausedEmitter = new events_1.EventEmitter();
        this.disposed = false;
        this.onPaused = this._onPausedEmitter.event;
        this._dap = new DeferredContainer(dap);
        this._delegate = delegate;
        this._sourceContainer = sourceContainer;
        this._cdp = cdp;
        this.id = Thread._lastThreadId++;
        this.replVariables = new variables_1.VariableStore(this._cdp, this, renameProvider, launchConfig.__autoExpandGetters, launchConfig.customDescriptionGenerator, launchConfig.customPropertiesGenerator);
        this._smartStepper = new smartStepping_1.SmartStepper(this.launchConfig, logger);
        this._initialize();
    }
    cdp() {
        return this._cdp;
    }
    name() {
        return this._delegate.name();
    }
    pausedDetails() {
        return this._pausedDetails;
    }
    pausedVariables() {
        return this._pausedVariables;
    }
    executionContexts() {
        return Array.from(this._executionContexts.values());
    }
    defaultExecutionContext() {
        for (const context of this._executionContexts.values()) {
            if (context.isDefault())
                return context;
        }
    }
    async resume() {
        this._sourceContainer.clearDisabledSourceMaps();
        if (!(await this._cdp.Debugger.resume({}))) {
            // We don't report the failure if the target wasn't paused. VS relies on this behavior.
            if (this._pausedDetails !== undefined) {
                return errors.createSilentError(localize('error.resumeDidFail', 'Unable to resume'));
            }
        }
        return { allThreadsContinued: false };
    }
    async pause() {
        this._expectedPauseReason = { reason: 'pause' };
        if (await this._cdp.Debugger.pause({})) {
            return {};
        }
        return errors.createSilentError(localize('error.pauseDidFail', 'Unable to pause'));
    }
    async stepOver() {
        this._expectedPauseReason = { reason: 'step', direction: 1 /* Over */ };
        if (await this._cdp.Debugger.stepOver({})) {
            return {};
        }
        return errors.createSilentError(localize('error.stepOverDidFail', 'Unable to step next'));
    }
    async stepInto() {
        this._waitingForStepIn = this._pausedDetails;
        this._expectedPauseReason = { reason: 'step', direction: 0 /* In */ };
        if (await this._cdp.Debugger.stepInto({ breakOnAsyncCall: true })) {
            return {};
        }
        return errors.createSilentError(localize('error.stepInDidFail', 'Unable to step in'));
    }
    async stepOut() {
        this._expectedPauseReason = { reason: 'step', direction: 2 /* Out */ };
        if (await this._cdp.Debugger.stepOut({})) {
            return {};
        }
        return errors.createSilentError(localize('error.stepOutDidFail', 'Unable to step out'));
    }
    _stackFrameNotFoundError() {
        return errors.createSilentError(localize('error.stackFrameNotFound', 'Stack frame not found'));
    }
    _evaluateOnAsyncFrameError() {
        return errors.createSilentError(localize('error.evaluateOnAsyncStackFrame', 'Unable to evaluate on async stack frame'));
    }
    async restartFrame(params) {
        var _a;
        const stackFrame = (_a = this._pausedDetails) === null || _a === void 0 ? void 0 : _a.stackTrace.frame(params.frameId);
        if (!stackFrame) {
            return this._stackFrameNotFoundError();
        }
        const callFrameId = stackFrame.callFrameId();
        if (!callFrameId) {
            return errors.createUserError(localize('error.restartFrameAsync', 'Cannot restart asynchronous frame'));
        }
        await this._cdp.Debugger.restartFrame({ callFrameId });
        this._expectedPauseReason = {
            reason: 'frame_entry',
            description: localize('reason.description.restart', 'Paused on frame entry'),
        };
        await this._cdp.Debugger.stepInto({});
        return {};
    }
    async stackTrace(params) {
        if (!this._pausedDetails)
            return errors.createSilentError(localize('error.threadNotPaused', 'Thread is not paused'));
        return this._pausedDetails.stackTrace.toDap(params);
    }
    async scopes(params) {
        const stackFrame = this._pausedDetails
            ? this._pausedDetails.stackTrace.frame(params.frameId)
            : undefined;
        if (!stackFrame)
            return this._stackFrameNotFoundError();
        return stackFrame.scopes();
    }
    async exceptionInfo() {
        const exception = this._pausedDetails && this._pausedDetails.exception;
        if (!exception)
            return errors.createSilentError(localize('error.threadNotPausedOnException', 'Thread is not paused on exception'));
        const preview = objectPreview.previewException(exception);
        return {
            exceptionId: preview.title,
            breakMode: 'all',
            details: {
                stackTrace: preview.stackTrace,
                evaluateName: undefined,
            },
        };
    }
    /**
     * Focuses the page for which the thread is attached.
     */
    async revealPage() {
        this._cdp.Page.bringToFront({});
        return {};
    }
    async completions(params) {
        let stackFrame;
        if (params.frameId !== undefined) {
            stackFrame = this._pausedDetails
                ? this._pausedDetails.stackTrace.frame(params.frameId)
                : undefined;
            if (!stackFrame)
                return this._stackFrameNotFoundError();
            if (!stackFrame.callFrameId())
                return this._evaluateOnAsyncFrameError();
        }
        // If we're changing an execution context, don't bother with JS completion.
        if (params.line === 1 && params.text.startsWith('cd ')) {
            return { targets: this.getExecutionContextCompletions(params) };
        }
        const targets = await this.completer.completions({
            executionContextId: this._selectedContext ? this._selectedContext.description.id : undefined,
            stackFrame,
            expression: params.text,
            position: new positions_1.Base1Position(params.line || 1, params.column),
        });
        // Merge the actual completion items with the synthetic target changing items.
        return { targets: [...this.getExecutionContextCompletions(params), ...targets] };
    }
    getExecutionContextCompletions(params) {
        if (params.line && params.line > 1) {
            return [];
        }
        const prefix = params.text.slice(0, params.column).trim();
        return [...this._executionContexts.values()]
            .map(c => `cd ${this._delegate.executionContextName(c.description)}`)
            .filter(label => label.startsWith(prefix))
            .map(label => ({ label, start: 0, length: params.text.length }));
    }
    async evaluate(args) {
        let callFrameId;
        let stackFrame;
        if (args.frameId !== undefined) {
            stackFrame = this._pausedDetails
                ? this._pausedDetails.stackTrace.frame(args.frameId)
                : undefined;
            if (!stackFrame)
                return this._stackFrameNotFoundError();
            callFrameId = stackFrame.callFrameId();
            if (!callFrameId)
                return this._evaluateOnAsyncFrameError();
        }
        if (args.context === 'repl' && args.expression.startsWith('cd ')) {
            const contextName = args.expression.substring('cd '.length).trim();
            for (const ec of this._executionContexts.values()) {
                if (this._delegate.executionContextName(ec.description) === contextName) {
                    this._selectedContext = ec;
                    return {
                        result: `[${contextName}]`,
                        variablesReference: 0,
                    };
                }
            }
        }
        // For clipboard evaluations, return a safe JSON-stringified string.
        const params = args.context === 'clipboard'
            ? {
                expression: serializeForClipboard_1.serializeForClipboardTmpl(args.expression, '2'),
                includeCommandLineAPI: true,
                returnByValue: true,
                objectGroup: 'console',
            }
            : {
                expression: args.expression,
                includeCommandLineAPI: true,
                objectGroup: 'console',
                generatePreview: true,
                timeout: args.context === 'hover' ? 500 : undefined,
            };
        if (args.context === 'repl') {
            params.expression = sourceUtils.wrapObjectLiteral(params.expression);
            if (params.expression.indexOf('await') !== -1) {
                const rewritten = sourceUtils.rewriteTopLevelAwait(params.expression);
                if (rewritten) {
                    params.expression = rewritten;
                    params.awaitPromise = true;
                }
            }
        }
        const responsePromise = this.evaluator.evaluate(callFrameId
            ? Object.assign(Object.assign({}, params), { callFrameId }) : Object.assign(Object.assign({}, params), { contextId: this._selectedContext ? this._selectedContext.description.id : undefined }), { isInternalScript: false, stackFrame });
        // Report result for repl immediately so that the user could see the expression they entered.
        if (args.context === 'repl') {
            return await this._evaluateRepl(responsePromise);
        }
        const response = await responsePromise;
        if (!response)
            return errors.createSilentError(localize('error.evaluateDidFail', 'Unable to evaluate'));
        if (response.exceptionDetails) {
            let text = response.exceptionDetails.exception
                ? objectPreview.previewException(response.exceptionDetails.exception).title
                : response.exceptionDetails.text;
            if (!text.startsWith('Uncaught'))
                text = 'Uncaught ' + text;
            return errors.createSilentError(text);
        }
        const variableStore = callFrameId ? this._pausedVariables : this.replVariables;
        if (!variableStore) {
            return errors.createSilentError(localize('error.evaluateDidFail', 'Unable to evaluate'));
        }
        const variable = args.context === 'watch'
            ? await variableStore.createVariableForWatchEval(response.result, args.expression)
            : await variableStore.createVariable(response.result, args.context);
        return {
            type: response.result.type,
            result: variable.value,
            variablesReference: variable.variablesReference,
            namedVariables: variable.namedVariables,
            indexedVariables: variable.indexedVariables,
        };
    }
    async _evaluateRepl(responsePromise) {
        const response = await responsePromise;
        if (!response)
            return { result: '', variablesReference: 0 };
        if (response.exceptionDetails) {
            const formattedException = await new console_1.ExceptionMessage(response.exceptionDetails).toDap(this);
            throw new ProtocolError.ProtocolError(errors.replError(formattedException.output));
        }
        else {
            const contextName = this._selectedContext && this.defaultExecutionContext() !== this._selectedContext
                ? `\x1b[33m[${this._delegate.executionContextName(this._selectedContext.description)}] `
                : '';
            const resultVar = await this.replVariables.createVariable(response.result, 'repl');
            return {
                variablesReference: resultVar.variablesReference,
                result: `${contextName}${resultVar.value}`,
            };
        }
    }
    _initialize() {
        this._cdp.Runtime.on('executionContextCreated', event => {
            this._executionContextCreated(event.context);
        });
        this._cdp.Runtime.on('executionContextDestroyed', event => {
            this._executionContextDestroyed(event.executionContextId);
        });
        this._cdp.Runtime.on('executionContextsCleared', () => {
            if (!this.launchConfig.noDebug) {
                this._ensureDebuggerEnabledAndRefreshDebuggerId();
            }
            this.replVariables.clear();
            this._executionContextsCleared();
        });
        this._cdp.Inspector.on('targetReloadedAfterCrash', () => {
            // It was reported that crashing targets sometimes loses breakpoints.
            // I could not reproduce this by calling `Page.crash()`, but put this fix
            // in nevertheless; it should be safe.
            this._breakpointManager.reapply();
        });
        if (this.launchConfig.outputCapture === "console" /* Console */) {
            this._cdp.Runtime.on('consoleAPICalled', event => {
                this.console.dispatch(this, event);
            });
            this._cdp.Runtime.on('exceptionThrown', event => {
                this.console.enqueue(this, new console_1.ExceptionMessage(event.exceptionDetails));
            });
        }
        this._cdp.Runtime.on('inspectRequested', event => {
            if (event.hints['copyToClipboard']) {
                this._copyObjectToClipboard(event.object);
            }
            else if (event.hints['queryObjects']) {
                this.console.enqueue(this, new console_1.QueryObjectsMessage(event.object, this.cdp()));
            }
            else
                this._revealObject(event.object);
        });
        this._cdp.Debugger.on('paused', async (event) => this._onPaused(event));
        this._cdp.Debugger.on('resumed', () => this.onResumed());
        this._cdp.Debugger.on('scriptParsed', event => this._onScriptParsed(event));
        this._cdp.Debugger.on('scriptFailedToParse', event => this._onScriptParsed(event));
        this._cdp.Runtime.enable({});
        if (!this.launchConfig.noDebug) {
            this._ensureDebuggerEnabledAndRefreshDebuggerId();
        }
        else {
            this.logger.info("runtime.launch" /* RuntimeLaunch */, 'Running with noDebug, so debug domains are disabled');
        }
        this._delegate.initialize();
        this._dap.with(dap => dap.thread({
            reason: 'started',
            threadId: this.id,
        }));
    }
    dapInitialized() {
        this._dap.resolve();
    }
    async refreshStackTrace() {
        if (!this._pausedDetails) {
            return;
        }
        const event = this._pausedDetailsEvent.get(this._pausedDetails);
        if (event) {
            this._pausedDetails = this._createPausedDetails(event);
        }
        this._onThreadResumed();
        await this._onThreadPaused(this._pausedDetails);
    }
    _executionContextCreated(description) {
        const context = new ExecutionContext(this, description);
        this._executionContexts.set(description.id, context);
    }
    _executionContextDestroyed(contextId) {
        const context = this._executionContexts.get(contextId);
        if (!context)
            return;
        this._executionContexts.delete(contextId);
    }
    _executionContextsCleared() {
        this._removeAllScripts();
        this._breakpointManager.executionContextWasCleared();
        if (this._pausedDetails)
            this.onResumed();
        this._executionContexts.clear();
    }
    _ensureDebuggerEnabledAndRefreshDebuggerId() {
        // There is a bug in Chrome that does not retain debugger id
        // across cross-process navigations. Refresh it upon clearing contexts.
        this._cdp.Debugger.enable({}).then(response => {
            if (response) {
                Thread._allThreadsByDebuggerId.set(response.debuggerId, this);
            }
        });
        this.exceptionPause.apply(this._cdp);
    }
    async _onPaused(event) {
        var _a, _b, _c, _d;
        const hitBreakpoints = ((_a = event.hitBreakpoints) !== null && _a !== void 0 ? _a : []).filter(bp => bp !== this._pauseOnSourceMapBreakpointId);
        const isInspectBrk = event.reason === 'Break on start';
        const location = event.callFrames[0].location;
        const scriptId = ((_b = event.data) === null || _b === void 0 ? void 0 : _b.scriptId) || location.scriptId;
        const isSourceMapPause = (event.reason === 'instrumentation' && ((_c = event.data) === null || _c === void 0 ? void 0 : _c.scriptId)) ||
            this._breakpointManager.isEntrypointBreak(hitBreakpoints, scriptId);
        this.evaluator.setReturnedValue((_d = event.callFrames[0]) === null || _d === void 0 ? void 0 : _d.returnValue);
        if (isSourceMapPause) {
            if (this.launchConfig.perScriptSourcemaps === 'auto' &&
                this._shouldEnablePerScriptSms(event)) {
                await this._enablePerScriptSourcemaps();
            }
            if (event.data && !isInspectBrk) {
                event.data.__rewriteAs = 'breakpoint';
            }
            if (await this._handleSourceMapPause(scriptId, location)) {
                // Pause if we just resolved a breakpoint that's on this
                // location; this won't have existed before now.
            }
            else if (isInspectBrk) {
                // Inspect-brk is handled later on
            }
            else if (await this.isCrossThreadStep(event)) {
                // Check if we're stepping into an async-loaded script (#223)
                event.data = Object.assign(Object.assign({}, event.data), { __rewriteAs: 'step' });
            }
            else if (await this._breakpointManager.shouldPauseAt(event, hitBreakpoints, this._delegate.entryBreakpoint, true)) {
                // Check if there are any user-defined breakpoints on this line
            }
            else {
                // If none of this above, it's pure instrumentation.
                return this.resume();
            }
        }
        else {
            const wantsPause = event.reason === 'exception'
                ? await this.exceptionPause.shouldPauseAt(event)
                : await this._breakpointManager.shouldPauseAt(event, hitBreakpoints, this._delegate.entryBreakpoint, false);
            if (!wantsPause) {
                return this.resume();
            }
        }
        // "Break on start" is not actually a by-spec reason in CDP, it's added on from Node.js, so cast `as string`:
        // https://github.com/nodejs/node/blob/9cbf6af5b5ace0cc53c1a1da3234aeca02522ec6/src/node_contextify.cc#L913
        if (isInspectBrk &&
            (('continueOnAttach' in this.launchConfig && this.launchConfig.continueOnAttach) ||
                this.launchConfig.type === "pwa-extensionHost" /* ExtensionHost */)) {
            this.resume();
            return;
        }
        // We store pausedDetails in a local variable to avoid race conditions while awaiting this._smartStepper.shouldSmartStep
        const pausedDetails = (this._pausedDetails = this._createPausedDetails(event));
        const smartStepDirection = await this._smartStepper.getSmartStepDirection(pausedDetails, this._expectedPauseReason);
        // avoid racing:
        if (this._pausedDetails !== pausedDetails) {
            return;
        }
        switch (smartStepDirection) {
            case 0 /* In */:
                return this.stepInto();
            case 2 /* Out */:
                return this.stepOut();
            case 1 /* Over */:
                return this.stepOver();
            default:
            // continue
        }
        this._waitingForStepIn = undefined;
        this._pausedDetailsEvent.set(pausedDetails, event);
        this._pausedVariables = this.replVariables.createDetached();
        await this._onThreadPaused(pausedDetails);
    }
    /**
     * Called when CDP indicates that we resumed. This is marked as public since
     * we also call this from the {@link ProfileController} when we disable
     * the debugger domain (which continues the thread but doesn't result in
     * a "resumed" event getting sent).
     */
    onResumed() {
        this._pausedDetails = undefined;
        this._pausedVariables = undefined;
        this.evaluator.setReturnedValue(undefined);
        this._onThreadResumed();
    }
    /**
     * @inheritdoc
     */
    async dispose() {
        this.disposed = true;
        this._removeAllScripts(true /* silent */);
        for (const [debuggerId, thread] of Thread._allThreadsByDebuggerId) {
            if (thread === this)
                Thread._allThreadsByDebuggerId.delete(debuggerId);
        }
        this._executionContextsCleared();
        if (this.console.length) {
            await new Promise(r => this.console.onDrained(r));
        }
        this.console.dispose();
        // Send 'exited' after all other thread-releated events
        await this._dap.with(dap => dap.thread({
            reason: 'exited',
            threadId: this.id,
        }));
    }
    rawLocation(location) {
        // Note: cdp locations are 0-based, while ui locations are 1-based. Also,
        // some we can *apparently* get negative locations; Vue's "hello world"
        // project was observed to emit source locations at (-1, -1) in its callframe.
        if ('location' in location) {
            const loc = location;
            return {
                url: loc.url,
                lineNumber: Math.max(0, loc.location.lineNumber) + 1,
                columnNumber: Math.max(0, loc.location.columnNumber || 0) + 1,
                scriptId: loc.location.scriptId,
            };
        }
        return {
            url: location.url || '',
            lineNumber: Math.max(0, location.lineNumber) + 1,
            columnNumber: Math.max(0, location.columnNumber || 0) + 1,
            scriptId: location.scriptId,
        };
    }
    /**
     * Gets the UI location given the raw location from the runtime. We make
     * an effort to avoid async/await in the happy path here, since this function
     * can get very hot in some scenarios.
     */
    rawLocationToUiLocation(rawLocation) {
        // disposed check from https://github.com/microsoft/vscode/issues/121136
        if (!rawLocation.scriptId || this.disposed) {
            return undefined;
        }
        const script = this._sourceContainer.scriptsById.get(rawLocation.scriptId);
        if (!script) {
            return this.rawLocationToUiLocationWithWaiting(rawLocation);
        }
        if (script.resolvedSource) {
            return this._sourceContainer.preferredUiLocation(Object.assign(Object.assign({}, sources_1.rawToUiOffset(rawLocation, script.resolvedSource.runtimeScriptOffset)), { source: script.resolvedSource }));
        }
        else {
            return script.source.then(source => this._sourceContainer.preferredUiLocation(Object.assign(Object.assign({}, sources_1.rawToUiOffset(rawLocation, source.runtimeScriptOffset)), { source })));
        }
    }
    async rawLocationToUiLocationWithWaiting(rawLocation) {
        const script = rawLocation.scriptId
            ? await this.getScriptByIdOrWait(rawLocation.scriptId)
            : undefined;
        if (!script) {
            return;
        }
        const source = await script.source;
        return this._sourceContainer.preferredUiLocation(Object.assign(Object.assign({}, sources_1.rawToUiOffset(rawLocation, source.runtimeScriptOffset)), { source }));
    }
    /**
     * Gets a script ID if it exists, or waits to up maxTime. In rare cases we
     * can get a request (like a stacktrace request) from DAP before Chrome
     * finishes passing its sources over. We *should* normally know about all
     * possible script IDs; this waits if we see one that we don't.
     */
    getScriptByIdOrWait(scriptId, maxTime = 500) {
        const script = this._sourceContainer.scriptsById.get(scriptId);
        return script || this.waitForScriptId(scriptId, maxTime);
    }
    waitForScriptId(scriptId, maxTime) {
        return new Promise(resolve => {
            const listener = this._sourceContainer.onScript(script => {
                if (script.scriptId === scriptId) {
                    resolve(script);
                    listener.dispose();
                    clearTimeout(timeout);
                }
            });
            const timeout = setTimeout(() => {
                resolve(undefined);
                listener.dispose();
            }, maxTime);
        });
    }
    async renderDebuggerLocation(loc) {
        const raw = this.rawLocation(loc);
        const ui = await this.rawLocationToUiLocation(raw);
        if (ui)
            return `@ ${await ui.source.prettyName()}:${ui.lineNumber}`;
        return `@ VM${raw.scriptId || 'XX'}:${raw.lineNumber}`;
    }
    async updateCustomBreakpoint(id, enabled) {
        if (!this._delegate.supportsCustomBreakpoints())
            return;
        const breakpoint = customBreakpoints_1.customBreakpoints().get(id);
        if (!breakpoint)
            return;
        // Do not fail for custom breakpoints, to account for
        // future changes in cdp vs stale breakpoints saved in the workspace.
        await breakpoint.apply(this._cdp, enabled);
    }
    _createPausedDetails(event) {
        var _a, _b;
        // When hitting breakpoint in compiled source, we ignore source maps during the stepping
        // sequence (or exceptions) until user resumes or hits another breakpoint-alike pause.
        // TODO: this does not work for async stepping just yet.
        const sameDebuggingSequence = event.reason === 'assert' ||
            event.reason === 'exception' ||
            event.reason === 'promiseRejection' ||
            event.reason === 'other' ||
            event.reason === 'ambiguous';
        const hitAnyBreakpoint = !!(event.hitBreakpoints && event.hitBreakpoints.length);
        if (hitAnyBreakpoint || !sameDebuggingSequence)
            this._sourceContainer.clearDisabledSourceMaps();
        if (event.hitBreakpoints && this._sourceMapDisabler) {
            for (const sourceToDisable of this._sourceMapDisabler(event.hitBreakpoints))
                this._sourceContainer.disableSourceMapForSource(sourceToDisable);
        }
        const stackTrace = stackTrace_1.StackTrace.fromDebugger(this, event.callFrames, event.asyncStackTrace, event.asyncStackTraceId);
        if (((_a = event.data) === null || _a === void 0 ? void 0 : _a.__rewriteAs) === 'breakpoint') {
            return {
                thread: this,
                stackTrace,
                reason: 'breakpoint',
                description: localize('pause.breakpoint', 'Paused on breakpoint'),
            };
        }
        if (((_b = event.data) === null || _b === void 0 ? void 0 : _b.__rewriteAs) === 'step') {
            return {
                thread: this,
                stackTrace,
                reason: 'step',
                description: localize('pause.default', 'Paused'),
            };
        }
        switch (event.reason) {
            case 'assert':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'exception',
                    description: localize('pause.assert', 'Paused on assert'),
                };
            case 'debugCommand':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'pause',
                    description: localize('pause.debugCommand', 'Paused on debug() call'),
                };
            case 'DOM':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'data breakpoint',
                    description: localize('pause.DomBreakpoint', 'Paused on DOM breakpoint'),
                };
            case 'EventListener':
                return this._resolveEventListenerBreakpointDetails(stackTrace, event);
            case 'exception':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'exception',
                    description: localize('pause.exception', 'Paused on exception'),
                    exception: event.data,
                };
            case 'promiseRejection':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'exception',
                    description: localize('pause.promiseRejection', 'Paused on promise rejection'),
                    exception: event.data,
                };
            case 'instrumentation':
                if (event.data && event.data['scriptId']) {
                    return {
                        thread: this,
                        stackTrace,
                        reason: 'step',
                        description: localize('pause.default', 'Paused'),
                    };
                }
                return {
                    thread: this,
                    stackTrace,
                    reason: 'function breakpoint',
                    description: localize('pause.instrumentation', 'Paused on instrumentation breakpoint'),
                };
            case 'XHR':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'data breakpoint',
                    description: localize('pause.xhr', 'Paused on XMLHttpRequest or fetch'),
                };
            case 'OOM':
                return {
                    thread: this,
                    stackTrace,
                    reason: 'exception',
                    description: localize('pause.oom', 'Paused before Out Of Memory exception'),
                };
            default:
                if (event.hitBreakpoints && event.hitBreakpoints.length) {
                    let isStopOnEntry = false; // By default we assume breakpoints aren't stop on entry
                    const userEntryBp = this._delegate.entryBreakpoint;
                    if (userEntryBp && event.hitBreakpoints.includes(userEntryBp.cdpId)) {
                        isStopOnEntry = true; // But if it matches the entry breakpoint id, then it's probably stop on entry
                        const entryBreakpointSource = this._sourceContainer.source({
                            path: urlUtils_1.fileUrlToAbsolutePath(userEntryBp.path),
                        });
                        if (entryBreakpointSource !== undefined) {
                            const entryBreakpointLocations = this._sourceContainer.currentSiblingUiLocations({
                                lineNumber: event.callFrames[0].location.lineNumber + 1,
                                columnNumber: (event.callFrames[0].location.columnNumber || 0) + 1,
                                source: entryBreakpointSource,
                            });
                            // But if there is a user breakpoint on the same location that the stop on entry breakpoint, then we consider it an user breakpoint
                            isStopOnEntry = !entryBreakpointLocations.some(location => this._breakpointManager.hasAtLocation(location));
                        }
                    }
                    if (!isStopOnEntry) {
                        this._breakpointManager.registerBreakpointsHit(event.hitBreakpoints);
                    }
                    return {
                        thread: this,
                        stackTrace,
                        hitBreakpoints: event.hitBreakpoints,
                        reason: isStopOnEntry ? 'entry' : 'breakpoint',
                        description: localize('pause.breakpoint', 'Paused on breakpoint'),
                    };
                }
                if (this._expectedPauseReason) {
                    return Object.assign({ thread: this, stackTrace, description: localize('pause.default', 'Paused') }, this._expectedPauseReason);
                }
                return {
                    thread: this,
                    stackTrace,
                    reason: 'pause',
                    description: localize('pause.default', 'Paused on debugger statement'),
                };
        }
    }
    _resolveEventListenerBreakpointDetails(stackTrace, event) {
        const data = event.data;
        const id = data ? data['eventName'] || '' : '';
        const breakpoint = customBreakpoints_1.customBreakpoints().get(id);
        if (breakpoint) {
            const details = breakpoint.details(data);
            return {
                thread: this,
                stackTrace,
                reason: 'function breakpoint',
                description: details.short,
                text: details.long,
            };
        }
        return {
            thread: this,
            stackTrace,
            reason: 'function breakpoint',
            description: localize('pause.eventListener', 'Paused on event listener'),
        };
    }
    _clearDebuggerConsole() {
        return {
            category: 'console',
            output: '\x1b[2J',
        };
    }
    scriptsFromSource(source) {
        return this._sourceScripts.get(source) || new Set();
    }
    _removeAllScripts(silent = false) {
        this._sourceContainer.clear(silent);
        this._scriptSources.clear();
        this._sourceMapLoads.clear();
    }
    _onScriptParsed(event) {
        if (event.url.endsWith(".cdp" /* InternalExtension */)) {
            // The customer doesn't care about the internal cdp files, so skip this event
            return;
        }
        if (this._sourceContainer.scriptsById.has(event.scriptId)) {
            return;
        }
        if (event.url)
            event.url = this._delegate.scriptUrlToUrl(event.url);
        let urlHashMap = this._scriptSources.get(event.url);
        if (!urlHashMap) {
            urlHashMap = new Map();
            this._scriptSources.set(event.url, urlHashMap);
        }
        const createSource = async () => {
            const prevSource = event.url && event.hash && urlHashMap && urlHashMap.get(event.hash);
            if (prevSource) {
                prevSource.addScriptId(event.scriptId);
                return prevSource;
            }
            const contentGetter = async () => {
                const response = await this._cdp.Debugger.getScriptSource({ scriptId: event.scriptId });
                return response ? response.scriptSource : undefined;
            };
            const inlineSourceOffset = event.startLine || event.startColumn
                ? { lineOffset: event.startLine, columnOffset: event.startColumn }
                : undefined;
            // see https://github.com/microsoft/vscode/issues/103027
            const runtimeScriptOffset = event.url.endsWith('#vscode-extension')
                ? { lineOffset: 2, columnOffset: 0 }
                : undefined;
            let resolvedSourceMapUrl;
            if (event.sourceMapURL && this.launchConfig.sourceMaps) {
                // Note: we should in theory refetch source maps with relative urls, if the base url has changed,
                // but in practice that usually means new scripts with new source maps anyway.
                resolvedSourceMapUrl = urlUtils.isDataUri(event.sourceMapURL)
                    ? event.sourceMapURL
                    : (event.url && urlUtils.completeUrl(event.url, event.sourceMapURL)) || event.url;
                if (!resolvedSourceMapUrl) {
                    this._dap.with(dap => errors.reportToConsole(dap, `Could not load source map from ${event.sourceMapURL}`));
                }
            }
            const source = await this._sourceContainer.addSource(event.url, contentGetter, resolvedSourceMapUrl, inlineSourceOffset, runtimeScriptOffset, event.hash);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            urlHashMap.set(event.hash, source);
            source.addScriptId(event.scriptId);
            let scriptSet = this._sourceScripts.get(source);
            if (!scriptSet) {
                scriptSet = new Set();
                this._sourceScripts.set(source, scriptSet);
            }
            scriptSet.add(script);
            return source;
        };
        const script = {
            url: event.url,
            scriptId: event.scriptId,
            source: createSource(),
            hash: event.hash,
        };
        script.source.then(s => (script.resolvedSource = s));
        this._sourceContainer.addScriptById(script);
        if (event.sourceMapURL) {
            // If we won't pause before executing this script, still try to load source
            // map and set breakpoints as soon as possible. We pause on the first line
            // (the "module entry breakpoint") to ensure this resolves.
            this._getOrStartLoadingSourceMaps(script);
        }
    }
    /**
     * Wait for source map to load and set all breakpoints in this particular
     * script. Returns true if the debugger should remain paused.
     */
    async _handleSourceMapPause(scriptId, brokenOn) {
        this._pausedForSourceMapScriptId = scriptId;
        const perScriptTimeout = this._sourceContainer.sourceMapTimeouts().sourceMapMinPause;
        const timeout = perScriptTimeout + this._sourceContainer.sourceMapTimeouts().sourceMapCumulativePause;
        const script = this._sourceContainer.scriptsById.get(scriptId);
        if (!script) {
            this._pausedForSourceMapScriptId = undefined;
            return false;
        }
        const timer = new hrnow_1.HrTime();
        const result = await Promise.race([
            this._getOrStartLoadingSourceMaps(script, brokenOn),
            promiseUtil_1.delay(timeout),
        ]);
        const timeSpentWallClockInMs = timer.elapsed().ms;
        const sourceMapCumulativePause = this._sourceContainer.sourceMapTimeouts().sourceMapCumulativePause -
            Math.max(timeSpentWallClockInMs - perScriptTimeout, 0);
        this._sourceContainer.setSourceMapTimeouts(Object.assign(Object.assign({}, this._sourceContainer.sourceMapTimeouts()), { sourceMapCumulativePause }));
        this.logger.verbose("internal" /* Internal */, `Blocked execution waiting for source-map`, {
            timeSpentWallClockInMs,
            sourceMapCumulativePause,
        });
        if (!result) {
            this._dap.with(dap => dap.output({
                category: 'stderr',
                output: localize('warnings.handleSourceMapPause.didNotWait', 'WARNING: Processing source-maps of {0} took longer than {1} ms so we continued execution without waiting for all the breakpoints for the script to be set.', script.url || script.scriptId, timeout),
            }));
        }
        console.assert(this._pausedForSourceMapScriptId === scriptId);
        this._pausedForSourceMapScriptId = undefined;
        return (!!result &&
            result
                .map(sources_1.base1To0)
                .some(b => b.lineNumber === brokenOn.lineNumber &&
                (brokenOn.columnNumber === undefined || brokenOn.columnNumber === b.columnNumber)));
    }
    /**
     * Loads sourcemaps for the given script and invokes the handler, if we
     * haven't already done so. Returns a promise that resolves with the
     * handler's results.
     */
    _getOrStartLoadingSourceMaps(script, brokenOn) {
        const existing = this._sourceMapLoads.get(script.scriptId);
        if (existing) {
            return existing;
        }
        const result = script.source
            .then(source => this._sourceContainer.waitForSourceMapSources(source))
            .then(sources => sources.length && this._scriptWithSourceMapHandler
            ? this._scriptWithSourceMapHandler(script, sources, brokenOn)
            : []);
        this._sourceMapLoads.set(script.scriptId, result);
        return result;
    }
    async _revealObject(object) {
        if (object.type !== 'function' || object.objectId === undefined)
            return;
        const response = await this._cdp.Runtime.getProperties({
            objectId: object.objectId,
            ownProperties: true,
        });
        if (!response)
            return;
        for (const p of response.internalProperties || []) {
            if (p.name !== '[[FunctionLocation]]' ||
                !p.value ||
                p.value.subtype !== 'internal#location')
                continue;
            const uiLocation = await this.rawLocationToUiLocation(this.rawLocation(p.value.value));
            if (uiLocation)
                this._sourceContainer.revealUiLocation(uiLocation);
            break;
        }
    }
    async _copyObjectToClipboard(object) {
        if (!object.objectId) {
            this._dap.with(dap => dap.copyRequested({ text: objectPreview.previewRemoteObject(object, 'copy') }));
            return;
        }
        try {
            const result = await serializeForClipboard_1.serializeForClipboard({
                cdp: this.cdp(),
                objectId: object.objectId,
                args: [2],
                silent: true,
                returnByValue: true,
            });
            this._dap.with(dap => dap.copyRequested({ text: result.value }));
        }
        catch (e) {
            // ignored
        }
        finally {
            this.cdp()
                .Runtime.releaseObject({ objectId: object.objectId })
                .catch(() => undefined);
        }
    }
    async _onThreadPaused(details) {
        this._expectedPauseReason = undefined;
        this._onPausedEmitter.fire(details);
        let hitBreakpointIds;
        // If we hit breakpoints, try to make sure they all get resolved before we
        // send the event to the UI. This should generally only happen if the UI
        // bulk-set breakpoints and some resolve faster than others, since we expect
        // the CDP in turn will tell *us* they're resolved before hitting them.
        if (details.hitBreakpoints) {
            hitBreakpointIds = await Promise.race([
                promiseUtil_1.delay(1000).then(() => undefined),
                Promise.all(details.hitBreakpoints
                    .map(bp => this._breakpointManager._resolvedBreakpoints.get(bp))
                    .filter((bp) => bp instanceof userDefinedBreakpoint_1.UserDefinedBreakpoint)
                    .map(r => r.untilSetCompleted().then(() => r.dapId))),
            ]);
        }
        this._dap.with(dap => dap.stopped({
            reason: details.reason,
            description: details.description,
            threadId: this.id,
            text: details.text,
            hitBreakpointIds,
            allThreadsStopped: false,
        }));
    }
    _onThreadResumed() {
        this._dap.with(dap => dap.continued({
            threadId: this.id,
            allThreadsContinued: false,
        }));
    }
    /**
     * Returns whether the pause event is (probably) from a cross-thread step.
     * @see https://github.com/microsoft/vscode-js-debug/issues/223
     */
    isCrossThreadStep(event) {
        if (!event.asyncStackTraceId || !event.asyncStackTraceId.debuggerId) {
            return false;
        }
        const parent = Thread.threadForDebuggerId(event.asyncStackTraceId.debuggerId);
        if (!parent || !parent._waitingForStepIn) {
            return false;
        }
        const originalStack = parent._waitingForStepIn.stackTrace;
        return parent._cdp.Debugger.getStackTrace({ stackTraceId: event.asyncStackTraceId }).then(trace => {
            if (!trace || !trace.stackTrace.callFrames.length) {
                return false;
            }
            const parentFrame = stackTrace_1.StackFrame.fromRuntime(parent, trace.stackTrace.callFrames[0], false);
            if (!parentFrame.equivalentTo(originalStack.frames[0])) {
                return false;
            }
            parent._waitingForStepIn = undefined;
            return true;
        });
    }
    async setScriptSourceMapHandler(pause, handler) {
        this._scriptWithSourceMapHandler = handler;
        const needsPause = pause && this._sourceContainer.sourceMapTimeouts().sourceMapMinPause && handler;
        if (needsPause && !this._pauseOnSourceMapBreakpointId) {
            const result = await this._cdp.Debugger.setInstrumentationBreakpoint({
                instrumentation: 'beforeScriptWithSourceMapExecution',
            });
            this._pauseOnSourceMapBreakpointId = result ? result.breakpointId : undefined;
        }
        else if (!needsPause && this._pauseOnSourceMapBreakpointId) {
            const breakpointId = this._pauseOnSourceMapBreakpointId;
            this._pauseOnSourceMapBreakpointId = undefined;
            await this._cdp.Debugger.removeBreakpoint({ breakpointId });
        }
    }
    /**
     * Handles a paused event that is an instrumentation breakpoint on what
     * looks like a webpack module eval bundle. These bundles are made up of
     * separate `eval()` calls for each different module, each of which has their
     * own source map. Because of this, pausing when we see a script with a
     * sourcemap becomes incredibly slow.
     *
     * If we enounter this, we remove the instrumentation breakpoint and instead
     * tell our breakpoint manager to set very aggressively-matched entrypoint
     * breakpoints and use those instead. It's not quite as accurate, but it's
     * far better than takes minutes to load simple apps.
     *
     * (You might ask "what does Chrome devtools do here?" The answer is:
     * nothing. They don't seem to have special logic to ensure we set
     * breakpoints before evaluating code, they just work as fast as they can and
     * hope the breakpoints get set in time.)
     */
    async _enablePerScriptSourcemaps() {
        await this._breakpointManager.updateEntryBreakpointMode(this, 1 /* Greedy */);
        await this.setScriptSourceMapHandler(false, this._scriptWithSourceMapHandler);
    }
    _shouldEnablePerScriptSms(event) {
        var _a, _b, _c;
        if (event.reason !== 'instrumentation' ||
            !event.data ||
            !((_a = event.data.sourceMapURL) === null || _a === void 0 ? void 0 : _a.startsWith('data:'))) {
            return false;
        }
        return ((_b = event.data.url) === null || _b === void 0 ? void 0 : _b.startsWith('webpack')) || ((_c = event.data.url) === null || _c === void 0 ? void 0 : _c.startsWith('ng:'));
    }
    setSourceMapDisabler(sourceMapDisabler) {
        this._sourceMapDisabler = sourceMapDisabler;
    }
    static threadForDebuggerId(debuggerId) {
        return Thread._allThreadsByDebuggerId.get(debuggerId);
    }
    /**
     * Replaces locations in the stack trace with their source locations.
     */
    async replacePathsInStackTrace(trace) {
        // Either match lines like
        // "    at fulfilled (/Users/roblou/code/testapp-node2/out/app.js:5:58)"
        // or
        // "    at /Users/roblou/code/testapp-node2/out/app.js:60:23"
        // and replace the path in them
        const re1 = /^(\W*at .*\()(.*):(\d+):(\d+)(\))$/;
        const re2 = /^(\W*at )(.*):(\d+):(\d+)$/;
        const lines = await Promise.all(trace.split('\n').map(line => {
            const match = re1.exec(line) || re2.exec(line);
            if (!match) {
                return line;
            }
            const [, prefix, url, lineNo, columnNo, suffix = ''] = match;
            const compiledSource = this._sourceContainer.getSourceByOriginalUrl(urlUtils.absolutePathToFileUrl(url)) ||
                this._sourceContainer.getSourceByOriginalUrl(url);
            if (!compiledSource) {
                return line;
            }
            return this._sourceContainer
                .preferredUiLocation({
                columnNumber: Number(columnNo),
                lineNumber: Number(lineNo),
                source: compiledSource,
            })
                .then(({ source, lineNumber, columnNumber }) => `${prefix}${source.absolutePath}:${lineNumber}:${columnNumber}${suffix}`);
        }));
        return lines.join('\n');
    }
}
exports.Thread = Thread;
Thread._lastThreadId = 0;
Thread._allThreadsByDebuggerId = new Map();
//# sourceMappingURL=threads.js.map
//# sourceMappingURL=threads.js.map