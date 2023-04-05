"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserTargetManager = void 0;
const events_1 = require("../../common/events");
const browserTargets_1 = require("./browserTargets");
const frames_1 = require("./frames");
const serviceWorkers_1 = require("./serviceWorkers");
class BrowserTargetManager {
    constructor(connection, process, browserSession, sourcePathResolver, logger, telemetry, launchParams, targetOrigin) {
        this.process = process;
        this.logger = logger;
        this.telemetry = telemetry;
        this.launchParams = launchParams;
        this._targets = new Map();
        this._detachedTargets = new Set();
        this.frameModel = new frames_1.FrameModel();
        this.serviceWorkerModel = new serviceWorkers_1.ServiceWorkerModel(this.frameModel);
        this._lifecycleQueue = Promise.resolve();
        this._onTargetAddedEmitter = new events_1.EventEmitter();
        this._onTargetRemovedEmitter = new events_1.EventEmitter();
        this.onTargetAdded = this._onTargetAddedEmitter.event;
        this.onTargetRemoved = this._onTargetRemovedEmitter.event;
        this._connection = connection;
        this._sourcePathResolver = sourcePathResolver;
        this._browser = browserSession;
        this._targetOrigin = targetOrigin;
        this.serviceWorkerModel.onDidChange(() => {
            for (const target of this._targets.values()) {
                if (target.type() === "service_worker" /* ServiceWorker */) {
                    target._onNameChangedEmitter.fire();
                }
            }
        });
    }
    static async connect(connection, process, sourcePathResolver, launchParams, logger, telemetry, targetOrigin) {
        const rootSession = connection.rootSession();
        const result = await rootSession.Target.attachToBrowserTarget({});
        if (!result)
            return;
        const browserSession = connection.createSession(result.sessionId);
        return new this(connection, process, browserSession, sourcePathResolver, logger, telemetry, launchParams, targetOrigin);
    }
    dispose() {
        this.serviceWorkerModel.dispose();
    }
    targetList() {
        return Array.from(this._targets.values()).filter(target => browserTargets_1.jsTypes.has(target.type()));
    }
    /**
     * Gets information of available page targets matching the filter.
     */
    async getCandiateInfo(filter) {
        const targets = await this._browser.Target.getTargets({});
        if (!targets) {
            return [];
        }
        return filter ? targets.targetInfos.filter(filter) : targets.targetInfos;
    }
    async closeBrowser() {
        var _a;
        if (this.launchParams.request === 'launch') {
            if (this.launchParams.cleanUp === 'wholeBrowser') {
                await this._browser.Browser.close({});
                (_a = this.process) === null || _a === void 0 ? void 0 : _a.kill();
            }
            else {
                for (const target of this._targets.values()) {
                    await this._browser.Target.closeTarget({ targetId: target.targetId });
                    this._connection.close();
                }
            }
            this.process = undefined;
        }
    }
    /**
     * Returns a promise that pends until the first target matching the given
     * filter attaches.
     */
    waitForMainTarget(filter) {
        let callback;
        const promise = new Promise(f => (callback = f));
        const attachInner = async (targetInfo) => {
            if ([...this._targets.values()].some(t => t.targetId === targetInfo.targetId) ||
                this._detachedTargets.has(targetInfo.targetId)) {
                return; // targetInfoChanged on something we're already connected to
            }
            if (filter && !filter(targetInfo)) {
                return;
            }
            // Watch for info updates in case things come through while we're
            // still attaching. See: https://github.com/microsoft/vscode/issues/90149
            const updateListener = this._browser.Target.on('targetInfoChanged', evt => {
                if (evt.targetInfo.targetId === targetInfo.targetId) {
                    targetInfo = evt.targetInfo;
                }
            });
            let response;
            try {
                response = await this._browser.Target.attachToTarget({
                    targetId: targetInfo.targetId,
                    flatten: true,
                });
            }
            finally {
                updateListener.dispose();
            }
            if (!response) {
                callback(undefined);
                return;
            }
            callback(this.attachedToTarget(targetInfo, response.sessionId, true));
        };
        this._browser.Target.setDiscoverTargets({ discover: true });
        this._browser.Target.on('targetCreated', this.enqueueLifecycleFn(evt => attachInner(evt.targetInfo)));
        this._browser.Target.on('targetInfoChanged', evt => this._targetInfoChanged(evt.targetInfo, this.enqueueLifecycleFn(attachInner)));
        this._browser.Target.on('detachedFromTarget', this.enqueueLifecycleFn(async (event) => {
            if (event.targetId) {
                await this._detachedFromTarget(event.sessionId, false);
            }
        }));
        return promise;
    }
    /**
     * Enqueues the function call to be run in the lifecycle of attach and
     * detach events.
     */
    enqueueLifecycleFn(fn) {
        return (arg) => (this._lifecycleQueue = this._lifecycleQueue.then(() => fn(arg)));
    }
    attachedToTarget(targetInfo, sessionId, waitingForDebugger, parentTarget, waitForDebuggerOnStart = true) {
        const existing = this._targets.get(sessionId);
        if (existing) {
            return existing;
        }
        const cdp = this._connection.createSession(sessionId);
        const target = new browserTargets_1.BrowserTarget(this, targetInfo, cdp, parentTarget, waitingForDebugger, this.launchParams, sessionId, this.logger, () => {
            this._connection.disposeSession(sessionId);
            this._detachedFromTarget(sessionId);
        });
        this._targets.set(sessionId, target);
        if (parentTarget)
            parentTarget._children.set(targetInfo.targetId, target);
        cdp.Target.on('attachedToTarget', async (event) => {
            this.attachedToTarget(event.targetInfo, event.sessionId, event.waitingForDebugger, target);
        });
        cdp.Target.on('detachedFromTarget', async (event) => {
            if (event.targetId) {
                this._detachedFromTarget(event.sessionId, false);
            }
        });
        cdp.Target.setAutoAttach({ autoAttach: true, waitForDebuggerOnStart, flatten: true });
        cdp.Network.setCacheDisabled({
            cacheDisabled: this.launchParams.disableNetworkCache,
        }).catch(err => this.logger.info("runtime.target" /* RuntimeTarget */, 'Error setting network cache state', err));
        // For the 'top-level' page, gather telemetry.
        if (!parentTarget) {
            this.retrieveBrowserTelemetry(cdp);
        }
        const type = targetInfo.type;
        if (browserTargets_1.domDebuggerTypes.has(type))
            this.frameModel.attached(cdp, targetInfo.targetId);
        this.serviceWorkerModel.attached(cdp);
        this._onTargetAddedEmitter.fire(target);
        // For targets that we don't report to the system, auto-resume them on our on.
        if (!browserTargets_1.jsTypes.has(type)) {
            target.runIfWaitingForDebugger();
        }
        else if (type === "page" /* Page */ && waitForDebuggerOnStart) {
            cdp.Page.waitForDebugger({});
        }
        return target;
    }
    async retrieveBrowserTelemetry(cdp) {
        try {
            const info = await cdp.Browser.getVersion({});
            if (!info) {
                throw new Error('Undefined return from getVersion()');
            }
            const properties = {
                targetCRDPVersion: info.protocolVersion,
                targetRevision: info.revision,
                targetUserAgent: info.userAgent,
                targetV8: info.jsVersion,
                targetVersion: '',
                targetProject: '',
                targetProduct: '',
            };
            this.logger.verbose("runtime.target" /* RuntimeTarget */, 'Retrieved browser information', info);
            const parts = (info.product || '').split('/');
            if (parts.length === 2) {
                // Currently response.product looks like "Chrome/65.0.3325.162" so we split the project and the actual version number
                properties.targetProject = parts[0];
                properties.targetVersion = parts[1];
            }
            else {
                // If for any reason that changes, we submit the entire product as-is
                properties.targetProduct = info.product;
            }
            this.telemetry.report('browserVersion', properties);
        }
        catch (e) {
            this.logger.warn("runtime.target" /* RuntimeTarget */, 'Error getting browser telemetry', e);
        }
    }
    async _detachedFromTarget(sessionId, isStillAttachedInternally = true) {
        var _a;
        const target = this._targets.get(sessionId);
        if (!target) {
            return;
        }
        this._targets.delete(sessionId);
        (_a = target.parentTarget) === null || _a === void 0 ? void 0 : _a._children.delete(sessionId);
        try {
            await target._detached();
        }
        catch (_b) {
            // ignored -- any network error when we want to detach anyway is fine
        }
        this._onTargetRemovedEmitter.fire(target);
        if (isStillAttachedInternally) {
            this._detachedTargets.add(target.targetId);
            await this._browser.Target.detachFromTarget({ sessionId });
        }
        if (!this._targets.size && this.launchParams.request === 'launch') {
            try {
                if (this.launchParams.cleanUp === 'wholeBrowser') {
                    await this._browser.Browser.close({});
                }
                else {
                    await this._browser.Target.closeTarget({ targetId: target.id() });
                    this._connection.close();
                }
            }
            catch (_c) {
                // ignored -- any network error when we want to detach anyway is fine
            }
        }
    }
    async _targetInfoChanged(targetInfo, attemptAttach) {
        const targets = [...this._targets.values()].filter(t => t.targetId === targetInfo.targetId);
        // if we arent' attach, detach any existing targets and then attempt to
        // re-attach if the conditions are right.
        if (!targetInfo.attached || !targets.length) {
            if (targets.length) {
                await Promise.all(targets.map(t => this._detachedFromTarget(t.sessionId, false)));
            }
            return attemptAttach(targetInfo);
        }
        for (const target of targets) {
            target._updateFromInfo(targetInfo);
        }
        // fire name changes for everyone since this might have caused a duplicate
        // title that we want to disambiguate.
        for (const target of this._targets.values()) {
            if (target.targetId !== targetInfo.targetId) {
                target._onNameChangedEmitter.fire();
            }
        }
    }
}
exports.BrowserTargetManager = BrowserTargetManager;
//# sourceMappingURL=browserTargetManager.js.map
//# sourceMappingURL=browserTargetManager.js.map
