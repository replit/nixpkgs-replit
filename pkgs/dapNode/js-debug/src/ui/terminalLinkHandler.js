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
exports.TerminalLinkHandler = void 0;
const inversify_1 = require("inversify");
const linkifyjs_1 = require("linkifyjs");
const url_1 = require("url");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const defaultBrowserProvider_1 = require("../common/defaultBrowserProvider");
const disposable_1 = require("../common/disposable");
const objUtils_1 = require("../common/objUtils");
const urlUtils_1 = require("../common/urlUtils");
const localize = nls.loadMessageBundle();
let TerminalLinkHandler = class TerminalLinkHandler {
    constructor(defaultBrowser) {
        this.defaultBrowser = defaultBrowser;
        this.enabledTerminals = new WeakSet();
        this.disposable = new disposable_1.DisposableList();
        this.notifiedCantOpenOnWeb = false;
        this.baseConfiguration = this.readConfig();
        this.disposable.push(vscode.workspace.onDidChangeConfiguration(evt => {
            if (evt.affectsConfiguration("debug.javascript.debugByLinkOptions" /* DebugByLinkOptions */)) {
                this.baseConfiguration = this.readConfig();
            }
        }));
    }
    /**
     * Turns on link handling in the given terminal.
     */
    enableHandlingInTerminal(terminal) {
        this.enabledTerminals.add(terminal);
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.disposable.dispose();
    }
    /**
     * @inheritdoc
     */
    provideTerminalLinks(context) {
        var _a;
        switch (this.baseConfiguration.enabled) {
            case 'off':
                return [];
            case 'always':
                break;
            case 'on':
            default:
                if (!this.enabledTerminals.has(context.terminal)) {
                    return [];
                }
        }
        const links = [];
        const getCwd = objUtils_1.once(() => {
            var _a;
            // Do our best to resolve the right workspace folder to launch in, and debug
            if ('cwd' in context.terminal.creationOptions && context.terminal.creationOptions.cwd) {
                const folder = vscode.workspace.getWorkspaceFolder(typeof context.terminal.creationOptions.cwd === 'string'
                    ? vscode.Uri.file(context.terminal.creationOptions.cwd)
                    : context.terminal.creationOptions.cwd);
                if (folder) {
                    return folder;
                }
            }
            return (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        });
        for (const link of linkifyjs_1.find(context.line, 'url')) {
            let start = -1;
            while ((start = context.line.indexOf(link.value, start + 1)) !== -1) {
                let uri;
                try {
                    uri = new url_1.URL(link.href);
                }
                catch (_b) {
                    continue;
                }
                // hack for https://github.com/Soapbox/linkifyjs/issues/317
                if (uri.protocol === "http:" /* Http */ &&
                    !link.value.startsWith("http:" /* Http */) &&
                    !urlUtils_1.isLoopbackIp(uri.hostname)) {
                    uri.protocol = "https:" /* Https */;
                }
                if (uri.protocol !== "http:" /* Http */ && uri.protocol !== "https:" /* Https */) {
                    continue;
                }
                links.push({
                    startIndex: start,
                    length: link.value.length,
                    tooltip: localize('terminalLinkHover.debug', 'Debug URL'),
                    target: uri,
                    workspaceFolder: (_a = getCwd()) === null || _a === void 0 ? void 0 : _a.index,
                });
            }
        }
        return links;
    }
    /**
     * @inheritdoc
     */
    async handleTerminalLink(terminal) {
        if (!(await this.handleTerminalLinkInner(terminal))) {
            vscode.env.openExternal(vscode.Uri.parse(terminal.target.toString()));
        }
    }
    /**
     * Launches a browser debug session when a link is clicked from a debug terminal.
     */
    async handleTerminalLinkInner(terminal) {
        var _a;
        if (!terminal.target) {
            return false;
        }
        const uri = terminal.target;
        if (vscode.env.uiKind === vscode.UIKind.Web) {
            if (this.notifiedCantOpenOnWeb) {
                return false;
            }
            vscode.window.showInformationMessage(localize('cantOpenChromeOnWeb', "We can't launch a browser in debug mode from here. If you want to debug this webpage, open this workspace from VS Code on your desktop."));
            this.notifiedCantOpenOnWeb = true;
            return false;
        }
        if (urlUtils_1.isMetaAddress(uri.hostname)) {
            uri.hostname = 'localhost';
        }
        let debugType = "pwa-chrome" /* Chrome */;
        try {
            if ((await this.defaultBrowser.lookup()) === 3 /* Edge */) {
                debugType = "pwa-msedge" /* Edge */;
            }
        }
        catch (_b) {
            // ignored
        }
        const cwd = terminal.workspaceFolder !== undefined
            ? (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[terminal.workspaceFolder] : undefined;
        vscode.debug.startDebugging(cwd, Object.assign(Object.assign({}, this.baseConfiguration), { type: debugType, name: uri.toString(), request: 'launch', url: uri.toString() }));
        return true;
    }
    readConfig() {
        let baseConfig = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.debugByLinkOptions" /* DebugByLinkOptions */);
        if (typeof baseConfig === 'boolean') {
            // old setting
            baseConfig = (baseConfig ? 'on' : 'off');
        }
        if (typeof baseConfig === 'string') {
            return { enabled: baseConfig };
        }
        return Object.assign({ enabled: 'on' }, baseConfig);
    }
};
TerminalLinkHandler = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(defaultBrowserProvider_1.IDefaultBrowserProvider))
], TerminalLinkHandler);
exports.TerminalLinkHandler = TerminalLinkHandler;
//# sourceMappingURL=terminalLinkHandler.js.map
//# sourceMappingURL=terminalLinkHandler.js.map
