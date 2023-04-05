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
exports.DiagnosticsUI = void 0;
const inversify_1 = require("inversify");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const ioc_extras_1 = require("../ioc-extras");
const debugSessionTracker_1 = require("./debugSessionTracker");
const localize = nls.loadMessageBundle();
const neverRemindKey = 'neverRemind';
let DiagnosticsUI = class DiagnosticsUI {
    constructor(fs, context, tracker) {
        this.fs = fs;
        this.context = context;
        this.tracker = tracker;
        this.dismissedForSession = false;
        this.isPrompting = false;
    }
    register(context) {
        context.subscriptions.push(contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.createDiagnostics" /* CreateDiagnostics */, async () => this.getDiagnosticInfo(await this.getTargetSession())), vscode.debug.onDidReceiveDebugSessionCustomEvent(async (evt) => {
            if (evt.event !== 'suggestDiagnosticTool' ||
                this.dismissedForSession ||
                this.context.workspaceState.get(neverRemindKey) ||
                this.isPrompting) {
                return;
            }
            this.isPrompting = true;
            const yes = localize('yes', 'Yes');
            const notNow = localize('notNow', 'Not Now');
            const never = localize('never', 'Never');
            const response = await vscode.window.showInformationMessage('It looks like you might be having trouble with breakpoints. Would you like to open our diagnostic tool?', yes, notNow, never);
            this.isPrompting = false;
            switch (response) {
                case yes:
                    this.getDiagnosticInfo(await this.getTargetSession(), true);
                    break;
                case never:
                    context.workspaceState.update(neverRemindKey, true);
                    break;
                case notNow:
                    this.dismissedForSession = true;
                    break;
            }
        }));
    }
    getTargetSession() {
        const active = vscode.debug.activeDebugSession;
        if (!active || !contributionUtils_1.isDebugType(active === null || active === void 0 ? void 0 : active.type)) {
            return this.pickSession();
        }
        if (debugSessionTracker_1.DebugSessionTracker.isConcreteSession(active)) {
            return active;
        }
        const children = this.tracker.getChildren(active);
        if (children.length === 1) {
            return children[0];
        }
        return this.pickSession();
    }
    pickSession() {
        return debugSessionTracker_1.DebugSessionTracker.pickSession(this.tracker.getConcreteSessions(), localize('selectInspectSession', 'Select the session you want to inspect:'));
    }
    async getDiagnosticInfo(session, fromSuggestion = false) {
        if (!session || !this.tracker.isRunning(session)) {
            vscode.window.showErrorMessage(localize('inspectSessionEnded', 'It looks like your debug session has already ended. Try debugging again, then run the "Debug: Diagnose Breakpoint Problems" command.'));
            return;
        }
        const { file } = await session.customRequest('createDiagnostics', { fromSuggestion });
        const panel = vscode.window.createWebviewPanel("jsDebugDiagnostics" /* DiagnosticsView */, 'Debug Diagnostics', vscode.ViewColumn.Active, {
            enableScripts: true,
        });
        panel.webview.html = await this.fs.readFile(file, 'utf-8');
    }
};
DiagnosticsUI = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.FS)),
    __param(1, inversify_1.inject(ioc_extras_1.ExtensionContext)),
    __param(2, inversify_1.inject(debugSessionTracker_1.DebugSessionTracker))
], DiagnosticsUI);
exports.DiagnosticsUI = DiagnosticsUI;
//# sourceMappingURL=diagnosticsUI.js.map
//# sourceMappingURL=diagnosticsUI.js.map
