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
exports.LongPredictionUI = void 0;
const inversify_1 = require("inversify");
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const ioc_extras_1 = require("../ioc-extras");
const localize = nls.loadMessageBundle();
const omitLongPredictionKey = 'omitLongPredictions';
let LongPredictionUI = class LongPredictionUI {
    constructor(context) {
        this.context = context;
    }
    /**
     * Registers the link UI for the extension.
     */
    register(context) {
        context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
            if (event.event === 'longPrediction') {
                this.promptLongBreakpoint(event.session.workspaceFolder);
            }
        }));
    }
    async promptLongBreakpoint(workspaceFolder) {
        if (this.context.workspaceState.get(omitLongPredictionKey)) {
            return;
        }
        const message = localize('longPredictionWarning.message', "It's taking a while to configure your breakpoints. You can speed this up by updating the 'outFiles' in your launch.json.");
        const openLaunch = localize('longPredictionWarning.open', 'Open launch.json');
        const dontShow = localize('longPredictionWarning.disable', "Don't show again");
        const result = await vscode.window.showWarningMessage(message, dontShow, openLaunch);
        if (result === dontShow) {
            this.context.workspaceState.update(omitLongPredictionKey, true);
            return;
        }
        if (result !== openLaunch) {
            return;
        }
        if (!workspaceFolder) {
            workspaceFolder = await vscode.window.showWorkspaceFolderPick();
        }
        if (!workspaceFolder) {
            await vscode.window.showWarningMessage(localize('longPredictionWarning.noFolder', 'No workspace folder open.'));
            return;
        }
        const doc = await vscode.workspace.openTextDocument(path_1.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json'));
        await vscode.window.showTextDocument(doc);
    }
};
LongPredictionUI = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.ExtensionContext))
], LongPredictionUI);
exports.LongPredictionUI = LongPredictionUI;
//# sourceMappingURL=longPredictionUI.js.map
//# sourceMappingURL=longPredictionUI.js.map
