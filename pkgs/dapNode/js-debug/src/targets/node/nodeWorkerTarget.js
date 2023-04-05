"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeWorkerTarget = void 0;
const events_1 = require("../../common/events");
const urlUtils_1 = require("../../common/urlUtils");
class NodeWorkerTarget {
    constructor(launchConfig, targetInfo, parentTarget, targetOriginValue, cdp, pathResolver, logger) {
        this.launchConfig = launchConfig;
        this.targetInfo = targetInfo;
        this.parentTarget = parentTarget;
        this.targetOriginValue = targetOriginValue;
        this.cdp = cdp;
        this.pathResolver = pathResolver;
        this.logger = logger;
        this.onNameChanged = new events_1.EventEmitter().event;
        this.attached = false;
        this.isWaitingForDebugger = true;
        cdp.pause();
    }
    id() {
        return this.targetInfo.targetId;
    }
    name() {
        return this.targetInfo.title;
    }
    fileName() {
        return this.targetInfo.url;
    }
    type() {
        return 'node';
    }
    parent() {
        return this.parentTarget;
    }
    children() {
        return [];
    }
    canStop() {
        return false;
    }
    stop() {
        // no-op
    }
    canRestart() {
        return false;
    }
    restart() {
        // no-op
    }
    canAttach() {
        return !this.attached;
    }
    async attach() {
        await Promise.all([this.cdp.Debugger.enable({}), this.cdp.Runtime.enable({})]);
        this.attached = true;
        return this.cdp;
    }
    canDetach() {
        return this.attached;
    }
    async detach() {
        // there seems to be a bug where if we detach while paused, the worker will remain paused
        await this.cdp.Debugger.resume({});
        await this.cdp.NodeWorker.detach({ sessionId: this.targetInfo.targetId });
        this.attached = false;
    }
    targetOrigin() {
        return this.targetOriginValue;
    }
    afterBind() {
        this.cdp.resume();
        return Promise.resolve();
    }
    async runIfWaitingForDebugger() {
        this.isWaitingForDebugger = false;
        await this.cdp.Runtime.runIfWaitingForDebugger({});
    }
    initialize() {
        return Promise.resolve();
    }
    waitingForDebugger() {
        return this.isWaitingForDebugger;
    }
    supportsCustomBreakpoints() {
        return false;
    }
    scriptUrlToUrl(url) {
        // copied from NodeTarget. Todo: should be merged into the path resolver logic
        const isPath = url[0] === '/' || (process.platform === 'win32' && url[1] === ':' && url[2] === '\\');
        return isPath ? urlUtils_1.absolutePathToFileUrl(url) : url;
    }
    sourcePathResolver() {
        return this.pathResolver;
    }
    executionContextName() {
        return this.targetInfo.title;
    }
}
exports.NodeWorkerTarget = NodeWorkerTarget;
//# sourceMappingURL=nodeWorkerTarget.js.map
//# sourceMappingURL=nodeWorkerTarget.js.map
