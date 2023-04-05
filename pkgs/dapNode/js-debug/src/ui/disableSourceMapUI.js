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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisableSourceMapUI = void 0;
const inversify_1 = require("inversify");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const localize = nls.loadMessageBundle();
let DisableSourceMapUI = class DisableSourceMapUI {
    register(context) {
        context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(evt => {
            if (evt.event !== 'suggestDisableSourcemap' || !contributionUtils_1.isDebugType(evt.session.type)) {
                return;
            }
            const body = evt.body;
            this.unmap(evt.session, body.source).catch(err => vscode.window.showErrorMessage(err.message));
        }));
    }
    async unmap(session, source) {
        const autoUnmap = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.unmapMissingSources" /* UnmapMissingSources */);
        if (autoUnmap || (await this.prompt())) {
            await session.customRequest('disableSourcemap', { source });
        }
    }
    async prompt() {
        const always = localize('always', 'Always');
        const alwayInWorkspace = localize('always', 'Always in this Workspace');
        const yes = localize('yes', 'Yes');
        const result = await vscode.window.showInformationMessage(localize('disableSourceMapUi.msg', 'This is a missing file path referenced by a sourcemap. Would you like to debug the compiled version instead?'), always, alwayInWorkspace, localize('no', 'No'), yes);
        switch (result) {
            case always:
                contributionUtils_1.writeConfig(vscode.workspace, "debug.javascript.unmapMissingSources" /* UnmapMissingSources */, true, vscode.ConfigurationTarget.Global);
                return true;
            case alwayInWorkspace:
                contributionUtils_1.writeConfig(vscode.workspace, "debug.javascript.unmapMissingSources" /* UnmapMissingSources */, true, vscode.ConfigurationTarget.Workspace);
                return true;
            case yes:
                return true;
            default:
                return false;
        }
    }
};
DisableSourceMapUI = __decorate([
    inversify_1.injectable()
], DisableSourceMapUI);
exports.DisableSourceMapUI = DisableSourceMapUI;
//# sourceMappingURL=disableSourceMapUI.js.map
//# sourceMappingURL=disableSourceMapUI.js.map
