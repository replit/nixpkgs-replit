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
exports.EdgeDevToolOpener = void 0;
const inversify_1 = require("inversify");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const debugSessionTracker_1 = require("./debugSessionTracker");
const localize = nls.loadMessageBundle();
const qualifies = (session) => {
    if ((session === null || session === void 0 ? void 0 : session.type) !== "pwa-msedge" /* Edge */) {
        return false;
    }
    const type = session.configuration.__browserTargetType;
    return type === "iframe" /* IFrame */ || type === "page" /* Page */;
};
const toolExtensionId = 'ms-edgedevtools.vscode-edge-devtools';
const commandId = 'vscode-edge-devtools.attachToCurrentDebugTarget';
let EdgeDevToolOpener = class EdgeDevToolOpener {
    constructor(tracker) {
        this.tracker = tracker;
    }
    /** @inheritdoc */
    register(context) {
        context.subscriptions.push(contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.openEdgeDevTools" /* OpenEdgeDevTools */, async () => {
            if (!vscode.extensions.all.some(e => e.id === toolExtensionId)) {
                return vscode.commands.executeCommand('workbench.extensions.action.showExtensionsWithIds', [toolExtensionId]);
            }
            const session = vscode.debug.activeDebugSession && qualifies(vscode.debug.activeDebugSession)
                ? vscode.debug.activeDebugSession
                : await debugSessionTracker_1.DebugSessionTracker.pickSession(this.tracker.getConcreteSessions().filter(qualifies), localize('selectEdgeToolSession', 'Select the page where you want to open the devtools'));
            if (!session) {
                return;
            }
            return vscode.commands.executeCommand(commandId, session.id);
        }));
    }
};
EdgeDevToolOpener = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(debugSessionTracker_1.DebugSessionTracker))
], EdgeDevToolOpener);
exports.EdgeDevToolOpener = EdgeDevToolOpener;
//# sourceMappingURL=edgeDevToolOpener.js.map
//# sourceMappingURL=edgeDevToolOpener.js.map
