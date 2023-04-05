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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UiProfileManager = void 0;
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const debugSessionTracker_1 = require("../debugSessionTracker");
const inversify_1 = require("inversify");
const profiling_1 = require("../../adapter/profiling");
const uiProfileSession_1 = require("./uiProfileSession");
const path_1 = require("path");
const ioc_extras_1 = require("../../ioc-extras");
const disposable_1 = require("../../common/disposable");
const terminationCondition_1 = require("./terminationCondition");
const os_1 = require("os");
const fsUtils_1 = require("../../common/fsUtils");
const manualTerminationCondition_1 = require("./manualTerminationCondition");
const localize = nls.loadMessageBundle();
const isProfileCandidate = (session) => '__pendingTargetId' in session.configuration;
let UiProfileManager = class UiProfileManager {
    constructor(tracker, fs, sessionStates, terminationConditions) {
        this.tracker = tracker;
        this.fs = fs;
        this.sessionStates = sessionStates;
        this.terminationConditions = terminationConditions;
        this.activeSessions = new Map();
        this.disposables = new disposable_1.DisposableList();
        this.disposables.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
            if (event.event !== 'profileStarted') {
                return;
            }
            const args = event.body;
            let session = this.activeSessions.get(event.session.id);
            if (!session) {
                session = new uiProfileSession_1.UiProfileSession(event.session, profiling_1.ProfilerFactory.ctors.find(t => t.type === args.type) || profiling_1.ProfilerFactory.ctors[0], new manualTerminationCondition_1.ManualTerminationCondition());
                this.registerSession(session);
            }
            session.setFile(args.file);
        }));
    }
    /**
     * Starts a profiling session.
     */
    async start(args) {
        let maybeSession;
        const candidates = [...this.tracker.getConcreteSessions()].filter(isProfileCandidate);
        if (args.sessionId) {
            maybeSession = candidates.find(s => s.id === args.sessionId);
        }
        else {
            maybeSession = await this.pickSession(candidates);
        }
        if (!maybeSession) {
            return; // cancelled or invalid
        }
        const session = maybeSession;
        const existing = this.activeSessions.get(session.id);
        if (existing) {
            if (!(await this.alreadyRunningSession(existing))) {
                return;
            }
        }
        const impl = await this.pickType(session, args.type);
        if (!impl) {
            return;
        }
        const termination = await this.pickTermination(session, args.termination);
        if (!termination) {
            return;
        }
        const uiSession = new uiProfileSession_1.UiProfileSession(session, impl, termination);
        if (!uiSession) {
            return;
        }
        this.registerSession(uiSession, args.onCompleteCommand);
        await uiSession.start();
    }
    /**
     * Stops the profiling session if it exists.
     */
    async stop(sessionId) {
        let uiSession;
        if (sessionId) {
            uiSession = this.activeSessions.get(sessionId);
        }
        else {
            const session = await this.pickSession([...this.activeSessions.values()].map(s => s.session));
            uiSession = session && this.activeSessions.get(session.id);
        }
        if (!uiSession) {
            return;
        }
        this.sessionStates.remove(uiSession.session.id);
        await uiSession.stop();
    }
    /**
     * @inheritdoc
     */
    dispose() {
        for (const session of this.activeSessions.values()) {
            session.dispose();
        }
        this.activeSessions.clear();
        this.disposables.dispose();
    }
    /**
     * Starts tracking a UI profile session in the manager.
     */
    registerSession(uiSession, onCompleteCommand) {
        this.activeSessions.set(uiSession.session.id, uiSession);
        this.sessionStates.add(uiSession.session.id, localize('profile.sessionState', 'Profiling'));
        uiSession.onStatusChange(() => this.updateStatusBar());
        uiSession.onStop(file => {
            if (file) {
                this.openProfileFile(uiSession, onCompleteCommand, uiSession.session, file);
            }
            this.activeSessions.delete(uiSession.session.id);
            uiSession.dispose();
            this.updateStatusBar();
        });
        this.updateStatusBar();
    }
    /**
     * Opens the profile file within the UI, called
     * when a session ends gracefully.
     */
    async openProfileFile(uiSession, onCompleteCommand, session, sourceFile) {
        var _a, _b, _c, _d;
        if (onCompleteCommand) {
            return Promise.all([
                vscode.commands.executeCommand(onCompleteCommand, {
                    contents: await this.fs.readFile(sourceFile, 'utf-8'),
                    basename: path_1.basename(sourceFile) + uiSession.impl.extension,
                }),
                this.fs.unlink(sourceFile),
            ]);
        }
        const directory = (_d = (_b = (_a = session.workspaceFolder) === null || _a === void 0 ? void 0 : _a.uri.fsPath) !== null && _b !== void 0 ? _b : (_c = vscode.workspace.workspaceFolders) === null || _c === void 0 ? void 0 : _c[0].uri.fsPath) !== null && _d !== void 0 ? _d : os_1.homedir();
        const now = new Date();
        const filename = [
            'vscode-profile',
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
        ]
            .map(n => String(n).padStart(2, '0'))
            .join('-') + uiSession.impl.extension;
        // todo: open as untitled, see: https://github.com/microsoft/vscode/issues/93441
        const fileUri = vscode.Uri.file(path_1.join(directory, filename));
        await fsUtils_1.moveFile(this.fs, sourceFile, fileUri.fsPath);
        await vscode.commands.executeCommand('vscode.open', fileUri);
    }
    /**
     * Updates the status bar based on the state of current debug sessions.
     */
    updateStatusBar() {
        var _a;
        if (this.activeSessions.size === 0) {
            (_a = this.statusBarItem) === null || _a === void 0 ? void 0 : _a.hide();
            vscode.commands.executeCommand('setContext', 'jsDebugIsProfiling', false);
            return;
        }
        if (!this.statusBarItem) {
            this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 500);
            this.statusBarItem.command = "extension.js-debug.stopProfile" /* StopProfile */;
        }
        vscode.commands.executeCommand('setContext', 'jsDebugIsProfiling', true);
        if (this.activeSessions.size === 1) {
            const session = this.activeSessions.values().next().value;
            this.statusBarItem.text = session.status
                ? localize('profile.status.single', '$(loading) Click to Stop Profiling ({0})', session.status)
                : localize('profile.status.default', '$(loading) Click to Stop Profiling');
        }
        else {
            this.statusBarItem.text = localize('profile.status.multiSession', '$(loading) Click to Stop Profiling ({0} sessions)', this.activeSessions.size);
        }
        this.statusBarItem.show();
    }
    /**
     * Triggered when we try to profile a session we're already profiling. Asks
     * if they want to stop and start profiling it again.
     */
    async alreadyRunningSession(existing) {
        const yes = localize('yes', 'Yes');
        const no = localize('no', 'No');
        const stopExisting = await vscode.window.showErrorMessage(localize('profile.alreadyRunning', 'A profiling session is already running, would you like to stop it and start a new session?'), yes, no);
        if (stopExisting !== yes) {
            return false;
        }
        await this.stop(existing.session.id);
        return true;
    }
    /**
     * Quickpick to select any of the given candidate sessions.
     */
    async pickSession(candidates) {
        if (candidates.length === 0) {
            return;
        }
        if (candidates.length === 1) {
            return candidates[0];
        }
        const chosen = await vscode.window.showQuickPick(candidates.map(c => ({ label: c.name, id: c.id })));
        return chosen && candidates.find(c => c.id === chosen.id);
    }
    /**
     * Picks the profiler type to run in the session.
     */
    async pickType(session, suggestedType) {
        const params = session.configuration;
        if (suggestedType) {
            return profiling_1.ProfilerFactory.ctors.find(t => t.type === suggestedType && t.canApplyTo(params));
        }
        const chosen = await this.pickWithLastDefault(localize('profile.type.title', 'Type of profile:'), profiling_1.ProfilerFactory.ctors.filter(ctor => ctor.canApplyTo(params)), this.lastChosenType);
        if (chosen) {
            this.lastChosenType = chosen.label;
        }
        return chosen;
    }
    /**
     * Picks the termination condition to use for the session.
     */
    async pickTermination(session, suggested) {
        var _a, _b;
        if (suggested) {
            const s = typeof suggested === 'string' ? { type: suggested } : suggested;
            return (_a = this.terminationConditions
                .find(t => t.id === s.type)) === null || _a === void 0 ? void 0 : _a.onPick(session, ...((_b = s.args) !== null && _b !== void 0 ? _b : []));
        }
        const chosen = await this.pickWithLastDefault(localize('profile.termination.title', 'How long to run the profile:'), this.terminationConditions, this.lastChosenTermination);
        if (chosen) {
            this.lastChosenTermination = chosen.label;
        }
        return chosen === null || chosen === void 0 ? void 0 : chosen.onPick(session);
    }
    async pickWithLastDefault(title, items, lastLabel) {
        if (items.length <= 1) {
            return items[0]; // first T or undefined
        }
        const quickpick = vscode.window.createQuickPick();
        quickpick.title = title;
        quickpick.items = items
            .slice()
            .sort((a, b) => {
            var _a, _b;
            if (a.label === lastLabel || b.label === lastLabel) {
                return a.label === lastLabel ? -1 : 1;
            }
            return ((_a = a.sortOrder) !== null && _a !== void 0 ? _a : 0) - ((_b = b.sortOrder) !== null && _b !== void 0 ? _b : 0);
        })
            .map(ctor => ({ label: ctor.label, description: ctor.description, alwaysShow: true }));
        const chosen = await new Promise(resolve => {
            quickpick.onDidAccept(() => { var _a; return resolve((_a = quickpick.selectedItems[0]) === null || _a === void 0 ? void 0 : _a.label); });
            quickpick.onDidHide(() => resolve(undefined));
            quickpick.show();
        });
        quickpick.dispose();
        if (!chosen) {
            return;
        }
        return items.find(c => c.label === chosen);
    }
};
UiProfileManager = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(debugSessionTracker_1.DebugSessionTracker)),
    __param(1, inversify_1.inject(ioc_extras_1.FS)),
    __param(2, inversify_1.inject(ioc_extras_1.SessionSubStates)),
    __param(3, inversify_1.multiInject(terminationCondition_1.ITerminationConditionFactory))
], UiProfileManager);
exports.UiProfileManager = UiProfileManager;
//# sourceMappingURL=uiProfileManager.js.map
//# sourceMappingURL=uiProfileManager.js.map
