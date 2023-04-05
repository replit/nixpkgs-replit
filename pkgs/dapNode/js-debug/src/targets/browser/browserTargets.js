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
exports.BrowserTarget = exports.domDebuggerTypes = exports.jsTypes = void 0;
const url_1 = require("url");
const events_1 = require("../../common/events");
const urlUtils = __importStar(require("../../common/urlUtils"));
const extensionHostExtras_1 = require("../node/extensionHostExtras");
/**
 * Types that can run JavaScript.
 */
exports.jsTypes = new Set([
    "page" /* Page */,
    "iframe" /* IFrame */,
    "worker" /* Worker */,
    "service_worker" /* ServiceWorker */,
]);
/**
 * Types for which we should attach DOM debug handlers.
 */
exports.domDebuggerTypes = new Set([
    "page" /* Page */,
    "iframe" /* IFrame */,
]);
/**
 * Types that can be restarted.
 */
const restartableTypes = new Set([
    "page" /* Page */,
    "iframe" /* IFrame */,
]);
/**
 * Types that can be stopped.
 */
const stoppableTypes = restartableTypes;
class BrowserTarget {
    constructor(targetManager, _targetInfo, cdp, parentTarget, waitingForDebugger, launchConfig, sessionId, logger, ondispose) {
        this._targetInfo = _targetInfo;
        this.launchConfig = launchConfig;
        this.sessionId = sessionId;
        this.logger = logger;
        this._attached = false;
        this._onNameChangedEmitter = new events_1.EventEmitter();
        this.onNameChanged = this._onNameChangedEmitter.event;
        this.entryBreakpoint = undefined;
        this._children = new Map();
        this._cdp = cdp;
        cdp.pause();
        this._manager = targetManager;
        this.parentTarget = parentTarget;
        this._waitingForDebugger = waitingForDebugger;
        this._updateFromInfo(_targetInfo);
        this._ondispose = ondispose;
    }
    get targetInfo() {
        return this._targetInfo;
    }
    get targetId() {
        return this._targetInfo.targetId;
    }
    /**
     * @inheritdoc
     */
    get supplementalConfig() {
        const type = this.type();
        return {
            __browserTargetType: type,
            __usePerformanceFromParent: type !== "page" /* Page */,
        };
    }
    targetOrigin() {
        return this._manager._targetOrigin;
    }
    id() {
        return this.sessionId;
    }
    cdp() {
        return this._cdp;
    }
    name() {
        return this._computeName();
    }
    fileName() {
        return this._targetInfo.url;
    }
    type() {
        return this._targetInfo.type;
    }
    afterBind() {
        this._cdp.resume();
        return Promise.resolve();
    }
    initialize() {
        return Promise.resolve();
    }
    async runIfWaitingForDebugger() {
        const todo = [this._cdp.Runtime.runIfWaitingForDebugger({})];
        if ('debugWebviews' in this.launchConfig) {
            // a vscode renderer attachment
            todo.push(this._cdp.Runtime.evaluate({ expression: extensionHostExtras_1.signalReadyExpr() }));
        }
        await Promise.all(todo);
    }
    parent() {
        if (this.parentTarget && !exports.jsTypes.has(this.parentTarget.type()))
            return this.parentTarget.parentTarget;
        return this.parentTarget;
    }
    children() {
        const result = [];
        for (const target of this._children.values()) {
            if (exports.jsTypes.has(target.type()))
                result.push(target);
            else
                result.push(...target.children());
        }
        return result;
    }
    canStop() {
        return stoppableTypes.has(this.type());
    }
    stop() {
        if (!this._manager.targetList().includes(this)) {
            return;
        }
        if (this.type() === "service_worker" /* ServiceWorker */) {
            // Stop both dedicated and parent service worker scopes for present and future browsers.
            this._manager.serviceWorkerModel.stopWorker(this.id());
            if (!this.parentTarget)
                return;
            this._manager.serviceWorkerModel.stopWorker(this.parentTarget.id());
        }
        else {
            this._cdp.Target.closeTarget({ targetId: this._targetInfo.targetId });
        }
    }
    canRestart() {
        return restartableTypes.has(this.type());
    }
    restart() {
        this._cdp.Page.reload({});
    }
    waitingForDebugger() {
        return this._waitingForDebugger;
    }
    canAttach() {
        return !this._attached;
    }
    async attach() {
        this._waitingForDebugger = false;
        this._attached = true;
        return Promise.resolve(this._cdp);
    }
    canDetach() {
        return this._attached;
    }
    async detach() {
        this._attached = false;
        this._manager._detachedFromTarget(this.sessionId);
    }
    executionContextName(description) {
        const auxData = description.auxData;
        const contextName = description.name;
        if (!auxData)
            return contextName;
        const frameId = auxData['frameId'];
        const frame = frameId ? this._manager.frameModel.frameForId(frameId) : undefined;
        if (frame && auxData['isDefault'] && !frame.parentFrame())
            return 'top';
        if (frame && auxData['isDefault'])
            return frame.displayName();
        if (frame)
            return `${contextName}`;
        return contextName;
    }
    supportsCustomBreakpoints() {
        return exports.domDebuggerTypes.has(this.type());
    }
    scriptUrlToUrl(url) {
        return urlUtils.completeUrl(this._targetInfo.url, url) || url;
    }
    sourcePathResolver() {
        return this._manager._sourcePathResolver;
    }
    _updateFromInfo(targetInfo) {
        // there seems to be a behavior (bug?) in Chrome where the target type is
        // set to 'other' before shutdown which causes us to lose some behavior.
        // Preserve the original type; it should never change (e.g. a page can't
        // become an iframe or a sevice worker).
        this._targetInfo = Object.assign(Object.assign({}, targetInfo), { type: this._targetInfo.type });
        this._onNameChangedEmitter.fire();
    }
    /**
     * Sets a function to compute a custom name for the target.
     * Used to name webviews in js-debug better. Can
     * return undefined to use the default handling.
     */
    setComputeNameFn(fn) {
        this._customNameComputeFn = fn;
        this._onNameChangedEmitter.fire();
    }
    _computeName() {
        var _a;
        const custom = (_a = this._customNameComputeFn) === null || _a === void 0 ? void 0 : _a.call(this, this);
        if (custom) {
            return custom;
        }
        if (this.type() === "service_worker" /* ServiceWorker */) {
            const version = this._manager.serviceWorkerModel.version(this.id());
            if (version)
                return version.label() + ' [Service Worker]';
        }
        let threadName = this._targetInfo.title;
        const isAmbiguous = threadName &&
            this._manager
                .targetList()
                .some(target => target instanceof BrowserTarget &&
                target !== this &&
                target._targetInfo.title === this._targetInfo.title);
        if (!isAmbiguous) {
            return threadName;
        }
        try {
            const parsedURL = new url_1.URL(this._targetInfo.url);
            if (parsedURL.protocol === 'data:') {
                threadName = ' <data>';
            }
            else if (parsedURL) {
                threadName += ` (${this._targetInfo.url.replace(/^[a-z]+:\/\/|\/$/gi, '')})`;
            }
            else {
                threadName += ` (${this._targetInfo.url})`;
            }
        }
        catch (e) {
            threadName += ` (${this._targetInfo.url})`;
        }
        return threadName;
    }
    async _detached() {
        await this._manager.serviceWorkerModel.detached(this._cdp);
        this._ondispose(this);
    }
}
exports.BrowserTarget = BrowserTarget;
//# sourceMappingURL=browserTargets.js.map
//# sourceMappingURL=browserTargets.js.map
