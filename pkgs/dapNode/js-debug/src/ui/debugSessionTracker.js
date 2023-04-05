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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var DebugSessionTracker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugSessionTracker = void 0;
const inversify_1 = require("inversify");
const vscode = __importStar(require("vscode"));
const contributionUtils_1 = require("../common/contributionUtils");
/**
 * Keeps a list of known js-debug sessions.
 */
let DebugSessionTracker = DebugSessionTracker_1 = class DebugSessionTracker {
    constructor() {
        this._onSessionAddedEmitter = new vscode.EventEmitter();
        this._onSessionEndedEmitter = new vscode.EventEmitter();
        this._disposables = [];
        this.sessions = new Map();
        /**
         * Fires when any new js-debug session comes in.
         */
        this.onSessionAdded = this._onSessionAddedEmitter.event;
        /**
         * Fires when any js-debug session ends.
         */
        this.onSessionEnded = this._onSessionEndedEmitter.event;
    }
    /**
     * Returns whether the session is a concrete debug
     * session -- that is, not a logical session wrapper.
     */
    static isConcreteSession(session) {
        return !!session.configuration.__pendingTargetId;
    }
    /**
     * Prompts the user to pick one of the given debug sessions. Will not show
     * a prompt if candidates < 2.
     */
    static pickSession(candidates, title) {
        if (candidates.length < 2) {
            return candidates[0];
        }
        const qp = vscode.window.createQuickPick();
        qp.title = title;
        qp.items = candidates.map(c => ({ label: c.name, id: c.id }));
        qp.ignoreFocusOut = true;
        return new Promise(resolve => {
            qp.onDidAccept(() => resolve(candidates.find(i => { var _a; return i.id === ((_a = qp.selectedItems[0]) === null || _a === void 0 ? void 0 : _a.id); })));
            qp.onDidHide(() => resolve(undefined));
            qp.show();
        }).finally(() => qp.dispose());
    }
    /**
     * Returns the session with the given ID.
     */
    getById(id) {
        return this.sessions.get(id);
    }
    /**
     * Gets whether the js-debug session is still running.
     */
    isRunning(session) {
        return [...this.sessions.values()].includes(session);
    }
    /**
     * Returns a list of sessions with the given debug session name.
     */
    getByName(name) {
        return [...this.sessions.values()].filter(s => s.name === name);
    }
    /**
     * Gets physical debug sessions -- that is, avoids the logical session wrapper.
     */
    getConcreteSessions() {
        return [...this.sessions.values()].filter(DebugSessionTracker_1.isConcreteSession);
    }
    /**
     * Gets all direct children of the given session.
     */
    getChildren(session) {
        return [...this.sessions.values()].filter(s => s.configuration.__parentId === session.id);
    }
    attach() {
        vscode.debug.onDidStartDebugSession(session => {
            if (contributionUtils_1.isDebugType(session.type)) {
                this.sessions.set(session.id, session);
                this._onSessionAddedEmitter.fire(session);
            }
        }, undefined, this._disposables);
        vscode.debug.onDidTerminateDebugSession(session => {
            if (contributionUtils_1.isDebugType(session.type)) {
                this.sessions.delete(session.id);
                this._onSessionEndedEmitter.fire(session);
            }
        }, undefined, this._disposables);
        // todo: move this into its own class
        vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
            if (!contributionUtils_1.isDebugType(event.session.type)) {
                return;
            }
            if (event.event === 'revealLocationRequested') {
                const params = event.body;
                const uri = vscode.debug.asDebugSourceUri(event.body.source);
                const options = {};
                if (params.line) {
                    const position = new vscode.Position((params.line || 1) - 1, (params.column || 1) - 1);
                    options.selection = new vscode.Range(position, position);
                }
                vscode.window.showTextDocument(uri, options);
                return;
            }
            if (event.event === 'copyRequested') {
                const params = event.body;
                vscode.env.clipboard.writeText(params.text);
                return;
            }
        }, undefined, this._disposables);
    }
    dispose() {
        for (const disposable of this._disposables)
            disposable.dispose();
        this._disposables = [];
    }
};
DebugSessionTracker = DebugSessionTracker_1 = __decorate([
    inversify_1.injectable()
], DebugSessionTracker);
exports.DebugSessionTracker = DebugSessionTracker;
//# sourceMappingURL=debugSessionTracker.js.map
//# sourceMappingURL=debugSessionTracker.js.map
