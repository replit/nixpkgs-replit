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
exports.ChromiumDebugConfigurationProvider = exports.ChromiumDebugConfigurationResolver = void 0;
const inversify_1 = require("inversify");
const os_1 = require("os");
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const fsUtils_1 = require("../../common/fsUtils");
const ioc_extras_1 = require("../../ioc-extras");
const baseConfigurationProvider_1 = require("./baseConfigurationProvider");
const baseConfigurationResolver_1 = require("./baseConfigurationResolver");
const nodeDebugConfigurationResolver_1 = require("./nodeDebugConfigurationResolver");
const terminalDebugConfigurationResolver_1 = require("./terminalDebugConfigurationResolver");
const localize = nls.loadMessageBundle();
const isLaunch = (value) => value.request === 'launch';
const isAttach = (value) => value.request === 'attach';
/**
 * Configuration provider for Chrome debugging.
 */
let ChromiumDebugConfigurationResolver = class ChromiumDebugConfigurationResolver extends baseConfigurationResolver_1.BaseConfigurationResolver {
    constructor(context, nodeProvider, terminalProvider, location, fs) {
        super(context);
        this.nodeProvider = nodeProvider;
        this.terminalProvider = terminalProvider;
        this.location = location;
        this.fs = fs;
    }
    async resolveBrowserCommon(folder, config) {
        if (config.request === 'attach') {
            // todo https://github.com/microsoft/vscode-chrome-debug/blob/ee5ae7ac7734f369dba58ba57bb910aac467c97a/src/extension.ts#L48
        }
        if (config.server && 'program' in config.server) {
            const serverOpts = Object.assign(Object.assign({}, config.server), { type: "pwa-node" /* Node */, request: 'launch', name: `${config.name}: Server` });
            config.server = (await this.nodeProvider.resolveDebugConfiguration(folder, serverOpts));
        }
        else if (config.server && 'command' in config.server) {
            config.server = await this.terminalProvider.resolveDebugConfiguration(folder, Object.assign(Object.assign({}, config.server), { type: "node-terminal" /* Terminal */, request: 'launch', name: `${config.name}: Server` }));
        }
        const browserLocation = this.location === 'remote' ? 'ui' : 'workspace';
        if (isLaunch(config) && !config.browserLaunchLocation) {
            config.browserLaunchLocation = browserLocation;
        }
        if (isAttach(config) && !config.browserAttachLocation) {
            config.browserAttachLocation = browserLocation;
        }
        if (config.request === 'launch') {
            const cast = config;
            this.applyDefaultRuntimeExecutable(cast);
        }
    }
    /**
     * @override
     */
    getSuggestedWorkspaceFolders(config) {
        return [config.rootPath, config.webRoot];
    }
    /**
     * @inheritdoc
     */
    async resolveDebugConfigurationWithSubstitutedVariables(_folder, debugConfiguration) {
        if ('__pendingTargetId' in debugConfiguration) {
            return debugConfiguration;
        }
        let config = debugConfiguration;
        if (config.request === 'launch') {
            const resolvedDataDir = await this.ensureNoLockfile(config);
            if (resolvedDataDir === undefined) {
                return;
            }
            config = resolvedDataDir;
        }
        return config;
    }
    async ensureNoLockfile(config) {
        var _a, _b;
        if (config.request !== 'launch') {
            return config;
        }
        const cast = config;
        // for no user data dirs, with have nothing to look at
        if (cast.userDataDir === false) {
            return config;
        }
        // if there's a port configured and something's there, we can connect to it regardless
        if (cast.port) {
            return config;
        }
        const userDataDir = typeof cast.userDataDir === 'string'
            ? cast.userDataDir
            : path_1.join((_a = this.extensionContext.storagePath) !== null && _a !== void 0 ? _a : os_1.tmpdir(), ((_b = cast.runtimeArgs) === null || _b === void 0 ? void 0 : _b.includes('--headless')) ? '.headless-profile' : '.profile');
        const lockfile = process.platform === 'win32'
            ? path_1.join(userDataDir, 'lockfile')
            : path_1.join(userDataDir, 'SingletonLock');
        if (await fsUtils_1.existsWithoutDeref(this.fs, lockfile)) {
            const debugAnyway = localize('existingBrowser.debugAnyway', 'Debug Anyway');
            const result = await vscode.window.showErrorMessage(localize('existingBrowser.alert', 'It looks like a browser is already running from {0}. Please close it before trying to debug, otherwise VS Code may not be able to connect to it.', cast.userDataDir === true
                ? localize('existingBrowser.location.default', 'an old debug session')
                : localize('existingBrowser.location.userDataDir', 'the configured userDataDir')), debugAnyway, localize('cancel', 'Cancel'));
            if (result !== debugAnyway) {
                return undefined;
            }
        }
        return Object.assign(Object.assign({}, config), { userDataDir });
    }
};
ChromiumDebugConfigurationResolver = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.ExtensionContext)),
    __param(1, inversify_1.inject(nodeDebugConfigurationResolver_1.NodeConfigurationResolver)),
    __param(2, inversify_1.inject(terminalDebugConfigurationResolver_1.TerminalDebugConfigurationResolver)),
    __param(3, inversify_1.inject(ioc_extras_1.ExtensionLocation)),
    __param(4, inversify_1.inject(ioc_extras_1.FS))
], ChromiumDebugConfigurationResolver);
exports.ChromiumDebugConfigurationResolver = ChromiumDebugConfigurationResolver;
let ChromiumDebugConfigurationProvider = class ChromiumDebugConfigurationProvider extends baseConfigurationProvider_1.BaseConfigurationProvider {
    provide() {
        return this.createLaunchConfigFromContext() || this.getDefaultLaunch();
    }
    getTriggerKind() {
        return vscode.DebugConfigurationProviderTriggerKind.Initial;
    }
    createLaunchConfigFromContext() {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'html') {
            return {
                type: this.getType(),
                request: 'launch',
                name: `Open ${path_1.basename(editor.document.uri.fsPath)}`,
                file: editor.document.uri.fsPath,
            };
        }
        return undefined;
    }
    getDefaultLaunch() {
        return {
            type: this.getType(),
            request: 'launch',
            name: localize('chrome.launch.name', 'Launch Chrome against localhost'),
            url: 'http://localhost:8080',
            webRoot: '${workspaceFolder}',
        };
    }
};
ChromiumDebugConfigurationProvider = __decorate([
    inversify_1.injectable()
], ChromiumDebugConfigurationProvider);
exports.ChromiumDebugConfigurationProvider = ChromiumDebugConfigurationProvider;
//# sourceMappingURL=chromiumDebugConfigurationProvider.js.map
//# sourceMappingURL=chromiumDebugConfigurationProvider.js.map
