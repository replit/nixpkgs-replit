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
exports.DebugLinkUi = void 0;
const inversify_1 = require("inversify");
const url_1 = require("url");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const defaultBrowserProvider_1 = require("../common/defaultBrowserProvider");
const ioc_extras_1 = require("../ioc-extras");
const localize = nls.loadMessageBundle();
function getPossibleUrl(link, requirePort) {
    if (!link) {
        return;
    }
    // if the link is already valid, all good
    try {
        if (new url_1.URL(link).hostname) {
            return link;
        }
    }
    catch (_a) {
        // not a valid link
    }
    // if it's in the format `<hostname>:<port>` then assume it's a url
    try {
        const prefixed = `http://${link}`;
        const url = new url_1.URL(prefixed);
        if (!requirePort || url.port) {
            return prefixed;
        }
    }
    catch (_b) {
        // not a valid link
    }
}
let DebugLinkUi = class DebugLinkUi {
    constructor(defaultBrowser, context) {
        this.defaultBrowser = defaultBrowser;
        this.context = context;
    }
    /**
     * Registers the link UI for the extension.
     */
    register(context) {
        context.subscriptions.push(vscode.commands.registerCommand("extension.js-debug.debugLink" /* DebugLink */, link => this.handle(link)));
    }
    /**
     * Handles a command, optionally called with a link.
     */
    async handle(link) {
        var _a, _b, _c;
        link = (_a = link !== null && link !== void 0 ? link : (await this.getLinkFromTextEditor())) !== null && _a !== void 0 ? _a : (await this.getLinkFromQuickInput());
        if (!link) {
            return;
        }
        let debugType = "pwa-chrome" /* Chrome */;
        try {
            if ((await this.defaultBrowser.lookup()) === 3 /* Edge */) {
                debugType = "pwa-msedge" /* Edge */;
            }
        }
        catch (_d) {
            // ignored
        }
        const baseConfig = (_b = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.debugByLinkOptions" /* DebugByLinkOptions */)) !== null && _b !== void 0 ? _b : {};
        const config = Object.assign(Object.assign({}, (typeof baseConfig === 'string' ? {} : baseConfig)), { type: debugType, name: link, request: 'launch', url: link });
        vscode.debug.startDebugging((_c = vscode.workspace.workspaceFolders) === null || _c === void 0 ? void 0 : _c[0], config);
        this.persistConfig(config);
    }
    getLinkFromTextEditor() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        return getPossibleUrl(editor.document.getText(editor.selection), true);
    }
    async getLinkFromQuickInput() {
        const clipboard = await vscode.env.clipboard.readText();
        const link = await vscode.window.showInputBox({
            value: getPossibleUrl(clipboard, false) || this.mostRecentLink,
            placeHolder: 'https://localhost:8080',
            validateInput: input => {
                if (input && !getPossibleUrl(input, false)) {
                    return localize('debugLink.invalidUrl', 'The URL provided is invalid');
                }
            },
        });
        if (!link) {
            return;
        }
        this.mostRecentLink = link;
        return link;
    }
    async persistConfig(config) {
        var _a;
        if (this.context.globalState.get('saveDebugLinks') === false) {
            return;
        }
        const launchJson = vscode.workspace.getConfiguration('launch');
        const configs = ((_a = launchJson.get('configurations')) !== null && _a !== void 0 ? _a : []);
        if (configs.some(c => c.url === config.url)) {
            return;
        }
        const yes = localize('yes', 'Yes');
        const never = localize('never', 'Never');
        const r = await vscode.window.showInformationMessage(localize('debugLink.savePrompt', 'Would you like to save a configuration in your launch.json for easy access later?'), yes, localize('no', 'No'), never);
        if (r === never) {
            this.context.globalState.update('saveDebugLinks', false);
        }
        if (r !== yes) {
            return;
        }
        await launchJson.update('configurations', [...configs, config]);
    }
};
DebugLinkUi = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(defaultBrowserProvider_1.IDefaultBrowserProvider)),
    __param(1, inversify_1.inject(ioc_extras_1.ExtensionContext))
], DebugLinkUi);
exports.DebugLinkUi = DebugLinkUi;
//# sourceMappingURL=debugLinkUI.js.map
//# sourceMappingURL=debugLinkUI.js.map
