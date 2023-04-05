"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = exports.RootSession = exports.Session = void 0;
const binder_1 = require("./binder");
const disposable_1 = require("./common/disposable");
const logging_1 = require("./common/logging");
const connection_1 = __importDefault(require("./dap/connection"));
const ioc_1 = require("./ioc");
const ioc_extras_1 = require("./ioc-extras");
const targetOrigin_1 = require("./targets/targetOrigin");
const telemetryReporter_1 = require("./telemetry/telemetryReporter");
/**
 * Encapsulates a running debug session under DAP
 * @template TSessionImpl Type of the mplementation specific debug session
 */
class Session {
    constructor(debugSession, transport, logger, sessionStates, parent) {
        this.debugSession = debugSession;
        this.logger = logger;
        this.sessionStates = sessionStates;
        this.parent = parent;
        this.subscriptions = new disposable_1.DisposableList();
        transport.setLogger(logger);
        this.connection = new connection_1.default(transport, this.logger);
    }
    listenToTarget(target) {
        this.subscriptions.push(target.onNameChanged(() => this.setName(target)), this.sessionStates.onAdd(([sessionId]) => sessionId === this.debugSession.id && this.setName(target)), this.sessionStates.onRemove(([sessionId]) => sessionId === this.debugSession.id && this.setName(target)));
        this.setName(target);
    }
    dispose() {
        this.subscriptions.dispose();
    }
    setName(target) {
        const substate = this.sessionStates.get(this.debugSession.id);
        let name = target.name();
        if (this.parent instanceof RootSession) {
            name = `${this.parent.debugSession.name}: ${name}`;
        }
        this.debugSession.name = substate ? `${name} (${substate})` : name;
    }
}
exports.Session = Session;
class RootSession extends Session {
    constructor(debugSession, transport, services) {
        super(debugSession, transport, services.get(logging_1.ILogger), services.get(ioc_extras_1.SessionSubStates));
        this.debugSession = debugSession;
        this.services = services;
        this.connection.attachTelemetry(services.get(telemetryReporter_1.ITelemetryReporter));
    }
    createBinder(delegate) {
        this._binder = new binder_1.Binder(delegate, this.connection, this.services, new targetOrigin_1.TargetOrigin(this.debugSession.id));
    }
    dispose() {
        var _a, _b;
        super.dispose();
        (_b = (_a = this._binder) === null || _a === void 0 ? void 0 : _a.dispose) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
}
exports.RootSession = RootSession;
class SessionManager {
    constructor(globalContainer, sessionLauncher) {
        this.globalContainer = globalContainer;
        this.sessionLauncher = sessionLauncher;
        this._disposables = [];
        this._sessions = new Map();
        this._pendingTarget = new Map();
        this._sessionForTarget = new Map();
        this._sessionForTargetCallbacks = new Map();
    }
    terminate(debugSession) {
        const session = this._sessions.get(debugSession.id);
        this._sessions.delete(debugSession.id);
        if (session)
            session.dispose();
    }
    createNewRootSession(debugSession, transport) {
        const root = new RootSession(debugSession, transport, ioc_1.createTopLevelSessionContainer(this.globalContainer));
        root.createBinder(this);
        this._sessions.set(debugSession.id, root);
        return root;
    }
    /**
     * @inheritdoc
     */
    createNewChildSession(debugSession, pendingTargetId, transport) {
        var _a;
        const pending = this._pendingTarget.get(pendingTargetId);
        if (!pending) {
            throw new Error(`Cannot find target ${pendingTargetId}`);
        }
        const { target, parent } = pending;
        const session = new Session(debugSession, transport, parent.logger, parent.sessionStates, parent);
        this._pendingTarget.delete(pendingTargetId);
        session.debugSession.name = target.name();
        session.listenToTarget(target);
        const callbacks = this._sessionForTargetCallbacks.get(target);
        this._sessionForTargetCallbacks.delete(target);
        (_a = callbacks === null || callbacks === void 0 ? void 0 : callbacks.fulfill) === null || _a === void 0 ? void 0 : _a.call(callbacks, session);
        this._sessions.set(debugSession.id, session);
        return session;
    }
    /**
     * @inheritdoc
     */
    async acquireDap(target) {
        const session = await this.getOrLaunchSession(target);
        return session.connection;
    }
    /**
     * Creates a debug session for the given target.
     */
    getOrLaunchSession(target) {
        const existingSession = this._sessionForTarget.get(target);
        if (existingSession) {
            return existingSession;
        }
        const newSession = new Promise(async (fulfill, reject) => {
            var _a, _b;
            let parentSession;
            const parentTarget = target.parent();
            if (parentTarget) {
                parentSession = await this.getOrLaunchSession(parentTarget);
            }
            else {
                parentSession = this._sessions.get(target.targetOrigin().id);
            }
            if (!parentSession) {
                throw new Error('Expected to get a parent debug session for target');
            }
            this._pendingTarget.set(target.id(), { target, parent: parentSession });
            this._sessionForTargetCallbacks.set(target, { fulfill, reject });
            const parentConfig = parentSession.debugSession.configuration;
            const config = {
                // see https://github.com/microsoft/vscode/issues/98993
                type: parentConfig.type === "pwa-extensionHost" /* ExtensionHost */
                    ? "pwa-chrome" /* Chrome */
                    : parentConfig.type,
                name: target.name(),
                request: parentSession.debugSession.configuration.request,
                __pendingTargetId: target.id(),
                // fix for https://github.com/microsoft/vscode/issues/102296
                preRestartTask: (_a = parentConfig.preRestartTask) !== null && _a !== void 0 ? _a : parentConfig.postDebugTask,
                postRestartTask: (_b = parentConfig.postRestartTask) !== null && _b !== void 0 ? _b : parentConfig.preLaunchTask,
            };
            this.sessionLauncher.launch(parentSession, target, config);
        });
        this._sessionForTarget.set(target, newSession);
        return newSession;
    }
    /**
     * @inheritdoc
     */
    initAdapter() {
        return Promise.resolve(false);
    }
    /**
     * @inheritdoc
     */
    releaseDap(target) {
        this._sessionForTarget.delete(target);
        const callbacks = this._sessionForTargetCallbacks.get(target);
        if (callbacks)
            callbacks.reject(new Error('Target gone'));
        this._sessionForTargetCallbacks.delete(target);
    }
    /**
     * @inheritdoc
     */
    dispose() {
        for (const session of this._sessions.values())
            session.dispose();
        this._sessions.clear();
        this._pendingTarget.clear();
        this._sessionForTarget.clear();
        this._sessionForTargetCallbacks.clear();
        for (const disposable of this._disposables)
            disposable.dispose();
        this._disposables = [];
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=sessionManager.js.map
//# sourceMappingURL=sessionManager.js.map
