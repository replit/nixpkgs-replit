"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTarget = void 0;
const path_1 = require("path");
const events_1 = require("../../common/events");
const urlUtils_1 = require("../../common/urlUtils");
class NodeTarget {
    constructor(launchConfig, pathResolver, targetOriginValue, connection, cdp, targetInfo, logger, lifecycle = {}, _parent) {
        this.launchConfig = launchConfig;
        this.pathResolver = pathResolver;
        this.targetOriginValue = targetOriginValue;
        this.connection = connection;
        this.targetInfo = targetInfo;
        this.logger = logger;
        this.lifecycle = lifecycle;
        this._parent = _parent;
        this._serialize = Promise.resolve(undefined);
        this._attached = false;
        this._onNameChangedEmitter = new events_1.EventEmitter();
        this._onDisconnectEmitter = new events_1.EventEmitter();
        this.entryBreakpoint = undefined;
        this.onDisconnect = this._onDisconnectEmitter.event;
        this.onNameChanged = this._onNameChangedEmitter.event;
        this.connection = connection;
        this._cdp = cdp;
        cdp.pause();
        this._waitingForDebugger = targetInfo.type === 'waitingForDebugger';
        if (targetInfo.title)
            this._targetName = `${path_1.basename(targetInfo.title)} [${targetInfo.processId}]`;
        else
            this._targetName = `[${targetInfo.processId}]`;
        cdp.Target.on('targetDestroyed', () => this.connection.close());
        connection.onDisconnected(() => this._disconnected());
    }
    id() {
        return this.targetInfo.targetId;
    }
    processId() {
        return this.targetInfo.processId;
    }
    name() {
        return this._targetName;
    }
    fileName() {
        return this.targetInfo.title;
    }
    type() {
        return 'node';
    }
    targetOrigin() {
        return this.targetOriginValue;
    }
    parent() {
        return this._parent;
    }
    async initialize() {
        if (this.lifecycle.initialized) {
            this.entryBreakpoint = (await this.lifecycle.initialized(this)) || undefined;
        }
    }
    waitingForDebugger() {
        return this._waitingForDebugger;
    }
    scriptUrlToUrl(url) {
        const isPath = url[0] === '/' || (process.platform === 'win32' && url[1] === ':' && url[2] === '\\');
        return isPath ? urlUtils_1.absolutePathToFileUrl(url) : url;
    }
    sourcePathResolver() {
        return this.pathResolver;
    }
    supportsCustomBreakpoints() {
        return false;
    }
    executionContextName() {
        return this._targetName;
    }
    hasParent() {
        return !!this._parent;
    }
    async runIfWaitingForDebugger() {
        await this._cdp.Runtime.runIfWaitingForDebugger({});
    }
    async _disconnected() {
        this._onDisconnectEmitter.fire();
    }
    canAttach() {
        return !this._attached;
    }
    async attach() {
        this._serialize = this._serialize.then(async () => {
            if (this._attached)
                return;
            return this._doAttach();
        });
        return this._serialize;
    }
    async _doAttach() {
        this._waitingForDebugger = false;
        this._attached = true;
        const result = await this._cdp.Target.attachToTarget({ targetId: this.targetInfo.targetId });
        if (!result) {
            this.logger.info("runtime.launch" /* RuntimeLaunch */, 'Failed to attach to target', {
                targetId: this.targetInfo.targetId,
            });
            return; // timed out or cancelled, may have been a short-lived process
        }
        this._cdp.NodeWorker.enable({ waitForDebuggerOnStart: true });
        if (result && '__dynamicAttach' in result) {
            await this._cdp.Debugger.enable({});
            await this._cdp.Runtime.enable({});
        }
        let defaultCountextId;
        this._cdp.Runtime.on('executionContextCreated', event => {
            if (event.context.auxData && event.context.auxData['isDefault'])
                defaultCountextId = event.context.id;
        });
        this._cdp.Runtime.on('executionContextDestroyed', event => {
            if (event.executionContextId === defaultCountextId)
                this.connection.close();
        });
        return this._cdp;
    }
    async afterBind() {
        this._cdp.resume();
    }
    canDetach() {
        return this._attached;
    }
    async detach() {
        this._serialize = this._serialize.then(async () => {
            if (this._waitingForDebugger) {
                const cdp = await this._doAttach();
                await (cdp === null || cdp === void 0 ? void 0 : cdp.Runtime.runIfWaitingForDebugger({}));
            }
            if (!this._attached) {
                return undefined;
            }
            this._doDetach();
        });
    }
    async _doDetach() {
        await Promise.all([
            this._cdp.Target.detachFromTarget({ targetId: this.targetInfo.targetId }),
            this._cdp.NodeWorker.disable({}),
        ]);
        this.connection.close();
        this._attached = false;
    }
    canRestart() {
        return false;
    }
    restart() {
        // no-op
    }
    canStop() {
        return true;
    }
    stop() {
        try {
            if (this.lifecycle.close) {
                this.lifecycle.close(this);
            }
        }
        finally {
            this.connection.close();
        }
    }
    /**
     * Refreshes the path resolve if the existing resolver didn't have a base
     * directory. This is used in deferred launches, namely the debug terminal
     * and auto attach, where the working directory is only discovered after
     * the debug target is prepared.
     */
    refreshPathResolver(cwd) {
        if (!this.pathResolver.resolutionOptions.basePath) {
            this.pathResolver = this.pathResolver.derive({ basePath: cwd });
        }
    }
}
exports.NodeTarget = NodeTarget;
//# sourceMappingURL=nodeTarget.js.map
//# sourceMappingURL=nodeTarget.js.map
