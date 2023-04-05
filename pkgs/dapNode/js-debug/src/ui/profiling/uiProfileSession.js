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
exports.UiProfileSession = void 0;
const events_1 = require("../../common/events");
const vscode = __importStar(require("vscode"));
const disposable_1 = require("../../common/disposable");
const nls = __importStar(require("vscode-nls"));
const localize = nls.loadMessageBundle();
/**
 * UI-side tracker for profiling sessions.
 */
class UiProfileSession {
    constructor(session, impl, termination) {
        var _a;
        this.session = session;
        this.impl = impl;
        this.termination = termination;
        this.statusChangeEmitter = new events_1.EventEmitter();
        this.stopEmitter = new events_1.EventEmitter();
        this._innerStatus = [];
        this.disposables = new disposable_1.DisposableList();
        this.state = 0 /* Collecting */;
        /**
         * Event that fires when the status changes.
         */
        this.onStatusChange = this.statusChangeEmitter.event;
        /**
         * Event that fires when the session stops, containing the file that
         * the profile is saved in.
         */
        this.onStop = this.stopEmitter.event;
        this.disposables.push(termination, vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
            if (event.session === session && event.event === 'profilerStateUpdate') {
                this.onStateUpdate(event.body);
            }
        }), vscode.debug.onDidTerminateDebugSession(s => {
            if (s === session) {
                this.stopEmitter.fire(undefined);
            }
        }));
        (_a = termination.attachTo) === null || _a === void 0 ? void 0 : _a.call(termination, this);
    }
    /**
     * Gets the current session status.
     */
    get status() {
        return this._innerStatus.filter(s => !!s).join(', ') || undefined;
    }
    /**
     * Starts the session and returns its ui-side tracker.
     */
    async start() {
        try {
            await this.session.customRequest('startProfile', Object.assign({ type: this.impl.type }, this.termination.customData));
        }
        catch (e) {
            vscode.window.showErrorMessage(e.message);
            this.stopEmitter.fire(undefined);
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.state = 2 /* Stopped */;
        this.disposables.dispose();
    }
    /**
     * Updates the file the profile is saved in.
     */
    setFile(file) {
        this.file = file;
    }
    /**
     * Stops the profile, and returns the file that profiling information was
     * saved in.
     */
    async stop() {
        if (this.state !== 0 /* Collecting */) {
            return;
        }
        this.setStatus(-1 /* Overwrite */, localize('profile.saving', 'Saving'));
        this.state = 1 /* Saving */;
        await this.session.customRequest('stopProfile', {});
        // this will trigger a profileStateUpdate with running=false
        // to finish up the session.
    }
    onStateUpdate(update) {
        if (update.running) {
            this.setStatus(0 /* Adapter */, update.label);
            return;
        }
        this.state = 2 /* Stopped */;
        this.stopEmitter.fire(this.file);
        this.dispose();
    }
    /**
     * Updates the session state, notifying the manager.
     */
    setStatus(category, status) {
        if (this.state !== 0 /* Collecting */) {
            return;
        }
        if (category === -1 /* Overwrite */) {
            this._innerStatus = [status];
        }
        else {
            this._innerStatus[category] = status;
        }
        this.statusChangeEmitter.fire(this.status);
    }
}
exports.UiProfileSession = UiProfileSession;
//# sourceMappingURL=uiProfileSession.js.map
//# sourceMappingURL=uiProfileSession.js.map
