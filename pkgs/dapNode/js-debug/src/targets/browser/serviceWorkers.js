"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceWorkerModel = exports.ServiceWorkerVersion = exports.ServiceWorkerRegistration = void 0;
const events_1 = require("../../common/events");
const url_1 = require("url");
class ServiceWorkerRegistration {
    constructor(payload) {
        this.versions = new Map();
        this.id = payload.registrationId;
        this.scopeURL = payload.scopeURL;
    }
}
exports.ServiceWorkerRegistration = ServiceWorkerRegistration;
class ServiceWorkerVersion {
    constructor(registration, payload) {
        this.revisions = [];
        this.registration = registration;
        this.id = payload.versionId;
        this.scriptURL = payload.scriptURL;
        this._targetId = payload.targetId;
        this._status = payload.status;
        this._runningStatus = payload.runningStatus;
    }
    addRevision(payload) {
        if (this._targetId && payload.targetId && this._targetId !== payload.targetId)
            console.error(`${this._targetId} !== ${payload.targetId}`);
        if (payload.targetId)
            this._targetId = payload.targetId;
        this._status = payload.status;
        this._runningStatus = payload.runningStatus;
        this.revisions.unshift(payload);
    }
    status() {
        return this._status;
    }
    runningStatus() {
        return this._runningStatus;
    }
    targetId() {
        return this._targetId;
    }
    label() {
        const parsedURL = new url_1.URL(this.registration.scopeURL);
        let path = parsedURL.pathname.substr(1);
        if (path.endsWith('/'))
            path = path.substring(0, path.length - 1);
        const scope = path ? path : `${parsedURL.host}`;
        const status = this._status === 'activated' ? '' : ` ${this._status}`;
        const runningStatus = this._runningStatus === 'running' ? '' : ` ${this._runningStatus}`;
        return `${scope} #${this.id}${status}${runningStatus}`;
    }
}
exports.ServiceWorkerVersion = ServiceWorkerVersion;
class ServiceWorkerModel {
    constructor(frameModel) {
        this._registrations = new Map();
        this._versions = new Map();
        this._onDidChangeUpdater = new events_1.EventEmitter();
        this.onDidChange = this._onDidChangeUpdater.event;
        this._targets = new Set();
        this._frameModel = frameModel;
        ServiceWorkerModel._instances.add(this);
    }
    dispose() {
        ServiceWorkerModel._instances.delete(this);
    }
    attached(cdp) {
        this._targets.add(cdp);
        if (this._cdp)
            return;
        // Use first available target connection.
        this._cdp = cdp;
        cdp.ServiceWorker.enable({});
        cdp.ServiceWorker.on('workerRegistrationUpdated', event => this._workerRegistrationsUpdated(event.registrations));
        cdp.ServiceWorker.on('workerVersionUpdated', event => this._workerVersionsUpdated(event.versions));
        if (ServiceWorkerModel._mode !== 'normal')
            this.setMode(ServiceWorkerModel._mode);
    }
    async detached(cdp) {
        this._targets.delete(cdp);
    }
    version(targetId) {
        return this._versions.get(targetId);
    }
    registrations() {
        const result = [];
        const urls = this._frameModel.frames().map(frame => frame.url());
        for (const registration of this._registrations.values()) {
            for (const url of urls) {
                if (url.startsWith(registration.scopeURL)) {
                    result.push(registration);
                    break;
                }
            }
        }
        return result;
    }
    registration(registrationId) {
        return this._registrations.get(registrationId);
    }
    _workerVersionsUpdated(payloads) {
        for (const payload of payloads) {
            const registration = this._registrations.get(payload.registrationId);
            if (!registration) {
                continue;
            }
            let version = registration.versions.get(payload.versionId);
            if (!version) {
                version = new ServiceWorkerVersion(registration, payload);
                registration.versions.set(payload.versionId, version);
            }
            if (payload.targetId)
                this._versions.set(payload.targetId, version);
            version.addRevision(payload);
            if (version.status() === 'redundant' && version.runningStatus() === 'stopped') {
                if (payload.targetId)
                    this._versions.delete(payload.targetId);
                registration.versions.delete(version.id);
            }
        }
        this._onDidChangeUpdater.fire();
    }
    _workerRegistrationsUpdated(payloads) {
        for (const payload of payloads) {
            if (payload.isDeleted) {
                if (!this._registrations.has(payload.registrationId))
                    debugger;
                this._registrations.delete(payload.registrationId);
            }
            else {
                if (this._registrations.has(payload.registrationId))
                    return;
                this._registrations.set(payload.registrationId, new ServiceWorkerRegistration(payload));
            }
        }
        this._onDidChangeUpdater.fire();
    }
    static setModeForAll(mode) {
        ServiceWorkerModel._mode = mode;
        for (const instance of ServiceWorkerModel._instances)
            instance.setMode(mode);
    }
    setMode(mode) {
        if (!this._cdp)
            return;
        this._cdp.ServiceWorker.setForceUpdateOnPageLoad({ forceUpdateOnPageLoad: mode === 'force' });
        for (const cdp of this._targets.values()) {
            if (mode === 'bypass') {
                cdp.Network.enable({});
                cdp.Network.setBypassServiceWorker({ bypass: true });
            }
            else {
                cdp.Network.disable({});
            }
        }
    }
    async stopWorker(targetId) {
        if (!this._cdp)
            return;
        const version = this.version(targetId);
        if (!version)
            return;
        await this._cdp.ServiceWorker.stopWorker({
            versionId: version.id,
        });
    }
}
exports.ServiceWorkerModel = ServiceWorkerModel;
ServiceWorkerModel._instances = new Set();
//# sourceMappingURL=serviceWorkers.js.map
//# sourceMappingURL=serviceWorkers.js.map
