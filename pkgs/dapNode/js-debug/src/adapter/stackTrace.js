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
exports.StackFrame = exports.StackTrace = void 0;
const nls = __importStar(require("vscode-nls"));
const objUtils_1 = require("../common/objUtils");
const positions_1 = require("../common/positions");
const errors_1 = require("../dap/errors");
const protocolError_1 = require("../dap/protocolError");
const smartStepping_1 = require("./smartStepping");
const threads_1 = require("./threads");
const localize = nls.loadMessageBundle();
class StackTrace {
    constructor(thread) {
        this.frames = [];
        this._frameById = new Map();
        this._lastFrameThread = thread;
    }
    static fromRuntime(thread, stack) {
        const result = new StackTrace(thread);
        for (let frameNo = 0; frameNo < stack.callFrames.length; frameNo++) {
            if (!stack.callFrames[frameNo].url.endsWith(".cdp" /* InternalExtension */)) {
                result.frames.push(StackFrame.fromRuntime(thread, stack.callFrames[frameNo], false));
            }
        }
        if (stack.parentId) {
            result._asyncStackTraceId = stack.parentId;
            console.assert(!stack.parent);
        }
        else {
            result._appendStackTrace(thread, stack.parent);
        }
        return result;
    }
    static async fromRuntimeWithPredicate(thread, stack, predicate, frameLimit = Infinity) {
        const result = new StackTrace(thread);
        for (let frameNo = 0; frameNo < stack.callFrames.length && frameLimit > 0; frameNo++) {
            if (!stack.callFrames[frameNo].url.endsWith(".cdp" /* InternalExtension */)) {
                const frame = StackFrame.fromRuntime(thread, stack.callFrames[frameNo], false);
                if (await predicate(frame)) {
                    result.frames.push();
                    frameLimit--;
                }
            }
        }
        if (stack.parentId) {
            result._asyncStackTraceId = stack.parentId;
            console.assert(!stack.parent);
        }
        else {
            result._appendStackTrace(thread, stack.parent);
        }
        return result;
    }
    static fromDebugger(thread, frames, parent, parentId) {
        const result = new StackTrace(thread);
        for (const callFrame of frames)
            result._appendFrame(StackFrame.fromDebugger(thread, callFrame));
        if (parentId) {
            result._asyncStackTraceId = parentId;
            console.assert(!parent);
        }
        else {
            result._appendStackTrace(thread, parent);
        }
        return result;
    }
    async loadFrames(limit) {
        while (this.frames.length < limit && this._asyncStackTraceId) {
            if (this._asyncStackTraceId.debuggerId)
                this._lastFrameThread = threads_1.Thread.threadForDebuggerId(this._asyncStackTraceId.debuggerId);
            if (!this._lastFrameThread) {
                this._asyncStackTraceId = undefined;
                break;
            }
            const response = await this._lastFrameThread
                .cdp()
                .Debugger.getStackTrace({ stackTraceId: this._asyncStackTraceId });
            this._asyncStackTraceId = undefined;
            if (response)
                this._appendStackTrace(this._lastFrameThread, response.stackTrace);
        }
        return this.frames;
    }
    frame(frameId) {
        return this._frameById.get(frameId);
    }
    _appendStackTrace(thread, stackTrace) {
        console.assert(!stackTrace || !this._asyncStackTraceId);
        while (stackTrace) {
            if (stackTrace.description === 'async function' && stackTrace.callFrames.length)
                stackTrace.callFrames.shift();
            if (stackTrace.callFrames.length) {
                this._appendFrame(StackFrame.asyncSeparator(thread, stackTrace.description || 'async'));
                for (const callFrame of stackTrace.callFrames)
                    this._appendFrame(StackFrame.fromRuntime(thread, callFrame, true));
            }
            if (stackTrace.parentId) {
                this._asyncStackTraceId = stackTrace.parentId;
                console.assert(!stackTrace.parent);
            }
            stackTrace = stackTrace.parent;
        }
    }
    _appendFrame(frame) {
        this.frames.push(frame);
        this._frameById.set(frame._id, frame);
    }
    async format() {
        const stackFrames = await this.loadFrames(50);
        const promises = stackFrames.map(frame => frame.format());
        return (await Promise.all(promises)).join('\n') + '\n';
    }
    async toDap(params) {
        const from = params.startFrame || 0;
        let to = (params.levels || 50) + from;
        const frames = await this.loadFrames(to);
        to = Math.min(frames.length, params.levels ? to : frames.length);
        const result = [];
        for (let index = from; index < to; index++) {
            result.push(frames[index].toDap(params.format));
        }
        return {
            stackFrames: await Promise.all(result),
            totalFrames: !!this._asyncStackTraceId ? 1000000 : frames.length,
        };
    }
}
exports.StackTrace = StackTrace;
class StackFrame {
    constructor(thread, name, rawLocation, isAsync = false) {
        this.isAsync = isAsync;
        this._isAsyncSeparator = false;
        this._id = ++StackFrame._lastFrameId;
        this._name = name || '<anonymous>';
        this._rawLocation = rawLocation;
        this.uiLocation = objUtils_1.once(() => thread.rawLocationToUiLocation(rawLocation));
        this._thread = thread;
    }
    get rawPosition() {
        // todo: move RawLocation to use Positions, then just return that.
        return new positions_1.Base0Position(this._rawLocation.lineNumber, this._rawLocation.columnNumber);
    }
    static fromRuntime(thread, callFrame, isAsync) {
        return new StackFrame(thread, callFrame.functionName, thread.rawLocation(callFrame), isAsync);
    }
    static fromDebugger(thread, callFrame) {
        const result = new StackFrame(thread, callFrame.functionName, thread.rawLocation(callFrame));
        result._scope = {
            chain: callFrame.scopeChain,
            thisObject: callFrame.this,
            returnValue: callFrame.returnValue,
            variables: new Array(callFrame.scopeChain.length).fill(undefined),
            // eslint-disable-next-line
            callFrameId: callFrame.callFrameId,
        };
        return result;
    }
    static asyncSeparator(thread, name) {
        const result = new StackFrame(thread, name, { lineNumber: 1, columnNumber: 1, url: '' }, true);
        result._isAsyncSeparator = true;
        return result;
    }
    /**
     * Gets whether this stackframe is at the same position as the other frame.
     */
    equivalentTo(other) {
        return (other &&
            other._rawLocation.columnNumber === this._rawLocation.columnNumber &&
            other._rawLocation.lineNumber === this._rawLocation.lineNumber &&
            other._rawLocation.scriptId === this._rawLocation.scriptId &&
            other._rawLocation.url === this._rawLocation.url);
    }
    callFrameId() {
        return this._scope ? this._scope.callFrameId : undefined;
    }
    async scopes() {
        if (!this._scope) {
            throw new protocolError_1.ProtocolError(errors_1.asyncScopesNotAvailable());
        }
        const scopes = [];
        for (let scopeNumber = 0; scopeNumber < this._scope.chain.length; scopeNumber++) {
            const scope = this._scope.chain[scopeNumber];
            let name = '';
            let presentationHint;
            switch (scope.type) {
                case 'global':
                    name = localize('scope.global', 'Global');
                    break;
                case 'local':
                    name = localize('scope.local', 'Local');
                    presentationHint = 'locals';
                    break;
                case 'with':
                    name = localize('scope.with', 'With Block');
                    presentationHint = 'locals';
                    break;
                case 'closure':
                    name = localize('scope.closure', 'Closure');
                    presentationHint = 'arguments';
                    break;
                case 'catch':
                    name = localize('scope.catch', 'Catch Block');
                    presentationHint = 'locals';
                    break;
                case 'block':
                    name = localize('scope.block', 'Block');
                    presentationHint = 'locals';
                    break;
                case 'script':
                    name = localize('scope.script', 'Script');
                    break;
                case 'eval':
                    name = localize('scope.eval', 'Eval');
                    break;
                case 'module':
                    name = localize('scope.module', 'Module');
                    break;
                default:
                    // fallback for custom scope types from other runtimes (#651)
                    name = scope.type.substr(0, 1).toUpperCase() + scope.type.substr(1);
                    break;
            }
            if (scope.name && scope.type === 'closure') {
                name = localize('scope.closureNamed', 'Closure ({0})', scope.name);
            }
            else if (scope.name) {
                name = `${name}: ${scope.name}`;
            }
            const variable = await this._scopeVariable(scopeNumber, this._scope);
            const dap = {
                name,
                presentationHint,
                expensive: scope.type === 'global',
                namedVariables: variable.namedVariables,
                indexedVariables: variable.indexedVariables,
                variablesReference: variable.variablesReference,
            };
            if (scope.startLocation) {
                const startRawLocation = this._thread.rawLocation(scope.startLocation);
                const startUiLocation = await this._thread.rawLocationToUiLocation(startRawLocation);
                dap.line = (startUiLocation || startRawLocation).lineNumber;
                dap.column = (startUiLocation || startRawLocation).columnNumber;
                if (startUiLocation)
                    dap.source = await startUiLocation.source.toDap();
                if (scope.endLocation) {
                    const endRawLocation = this._thread.rawLocation(scope.endLocation);
                    const endUiLocation = await this._thread.rawLocationToUiLocation(endRawLocation);
                    dap.endLine = (endUiLocation || endRawLocation).lineNumber;
                    dap.endColumn = (endUiLocation || endRawLocation).columnNumber;
                }
            }
            scopes.push(dap);
        }
        return { scopes };
    }
    async toDap(format) {
        const uiLocation = await this.uiLocation();
        const source = uiLocation ? await uiLocation.source.toDap() : undefined;
        const isSmartStepped = await smartStepping_1.shouldSmartStepStackFrame(this);
        const presentationHint = this._isAsyncSeparator
            ? 'label'
            : isSmartStepped
                ? 'deemphasize'
                : 'normal';
        if (isSmartStepped && source)
            source.origin = localize('smartStepSkipLabel', 'Skipped by smartStep');
        const line = (uiLocation || this._rawLocation).lineNumber;
        const column = (uiLocation || this._rawLocation).columnNumber;
        let formattedName = this._name;
        if (source && format) {
            if (format.module) {
                formattedName += ` [${source.name}]`;
            }
            if (format.line) {
                formattedName += ` Line ${line}`;
            }
        }
        return {
            id: this._id,
            name: formattedName,
            line,
            column,
            source,
            presentationHint,
            canRestart: !this.isAsync,
        };
    }
    async format() {
        if (this._isAsyncSeparator)
            return `◀ ${this._name} ▶`;
        const uiLocation = await this.uiLocation();
        const prettyName = (uiLocation && (await uiLocation.source.prettyName())) || this._rawLocation.url;
        const anyLocation = uiLocation || this._rawLocation;
        let text = `${this._name} @ ${prettyName}:${anyLocation.lineNumber}`;
        if (anyLocation.columnNumber > 1)
            text += `:${anyLocation.columnNumber}`;
        return text;
    }
    async _scopeVariable(scopeNumber, scope) {
        const existing = scope.variables[scopeNumber];
        if (existing) {
            return existing;
        }
        const scopeRef = {
            stackFrame: this,
            callFrameId: scope.callFrameId,
            scopeNumber,
        };
        const extraProperties = [];
        if (scopeNumber === 0) {
            extraProperties.push({ name: 'this', value: scope.thisObject });
            if (scope.returnValue)
                extraProperties.push({
                    name: localize('scope.returnValue', 'Return value'),
                    value: scope.returnValue,
                });
        }
        // eslint-disable-next-line
        const variable = await this._thread
            .pausedVariables()
            .createScope(scope.chain[scopeNumber].object, scopeRef, extraProperties);
        return (scope.variables[scopeNumber] = variable);
    }
    async completions() {
        if (!this._scope)
            return [];
        const variableStore = this._thread.pausedVariables();
        if (!variableStore) {
            return [];
        }
        const promises = [];
        for (let scopeNumber = 0; scopeNumber < this._scope.chain.length; scopeNumber++) {
            promises.push(this._scopeVariable(scopeNumber, this._scope).then(async (scopeVariable) => {
                if (!scopeVariable.variablesReference)
                    return [];
                const variables = await variableStore.getVariables({
                    variablesReference: scopeVariable.variablesReference,
                });
                return variables.map(variable => ({ label: variable.name, type: 'property' }));
            }));
        }
        const completions = await Promise.all(promises);
        return [].concat(...completions);
    }
}
exports.StackFrame = StackFrame;
StackFrame._lastFrameId = 0;
//# sourceMappingURL=stackTrace.js.map
//# sourceMappingURL=stackTrace.js.map
