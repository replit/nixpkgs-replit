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
exports.BaseConfigurationResolver = void 0;
const inversify_1 = require("inversify");
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const contributionUtils_1 = require("../../common/contributionUtils");
const logging_1 = require("../../common/logging");
const configuration_1 = require("../../configuration");
const ioc_extras_1 = require("../../ioc-extras");
/**
 * Base configuration provider that handles some resolution around common
 * options and handles errors.
 */
let BaseConfigurationResolver = class BaseConfigurationResolver {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
    }
    /**
     * @inheritdoc
     */
    get type() {
        return this.getType();
    }
    /**
     * @inheritdoc
     */
    async resolveDebugConfiguration(folder, config, token) {
        if ('__pendingTargetId' in config) {
            return config;
        }
        const castConfig = config;
        try {
            const resolved = await this.resolveDebugConfigurationAsync(folder, castConfig, token);
            return resolved && this.commonResolution(resolved, folder);
        }
        catch (err) {
            vscode.window.showErrorMessage(err.message, { modal: true });
        }
    }
    /**
     * Gets the default runtime executable for the type, if configured.
     */
    applyDefaultRuntimeExecutable(cfg) {
        if (cfg.runtimeExecutable) {
            return;
        }
        const allDefaults = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.defaultRuntimeExecutable" /* DefaultRuntimeExecutables */);
        const defaultValue = allDefaults ? allDefaults[cfg.type] : undefined;
        if (defaultValue) {
            cfg.runtimeExecutable = defaultValue;
        }
    }
    /**
     * Fulfills resolution common between all resolver configs.
     */
    commonResolution(config, folder) {
        var _a, _b;
        config.trace = logging_1.fulfillLoggerOptions(config.trace, this.extensionContext.logPath);
        config.__workspaceCachePath = this.extensionContext.storagePath;
        config.__breakOnConditionalError = (_a = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.breakOnConditionalError" /* BreakOnConditionalError */, folder)) !== null && _a !== void 0 ? _a : false;
        config.__autoExpandGetters = (_b = contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.autoExpandGetters" /* AutoExpandGetters */, folder)) !== null && _b !== void 0 ? _b : true;
        if (folder) {
            // all good, we know the VS Code will resolve the workspace
            config.__workspaceFolder = folder.uri.fsPath;
        }
        else {
            // otherwise, try to manually figure out an appropriate __workspaceFolder
            // if we don't already have it.
            if (!config.__workspaceFolder) {
                config.__workspaceFolder =
                    this.getSuggestedWorkspaceFolders(config)
                        .filter((f) => !!f && f !== '${workspaceFolder}')
                        .map(f => {
                        var _a;
                        return path_1.isAbsolute(f)
                            ? (_a = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(f))) === null || _a === void 0 ? void 0 : _a.uri.fsPath : f;
                    })
                        .find((f) => !!f) || '';
            }
            // If we found it, replace appropriately. Otherwise remove the 'optional'
            // usages, there's a chance we can still make it work.
            if (config.__workspaceFolder) {
                config = configuration_1.resolveWorkspaceInConfig(config);
            }
            else {
                config = configuration_1.removeOptionalWorkspaceFolderUsages(config);
            }
        }
        return config;
    }
    /**
     * Gets a list of folders that might be workspace folders, if we need to
     * resolve them. This lets users set _a_ folder to be the right folder in
     * a multi-root configuration, without having to manually override every default.
     * @see https://github.com/microsoft/vscode-js-debug/issues/525
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getSuggestedWorkspaceFolders(_config) {
        return [];
    }
};
BaseConfigurationResolver = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.ExtensionContext))
], BaseConfigurationResolver);
exports.BaseConfigurationResolver = BaseConfigurationResolver;
//# sourceMappingURL=baseConfigurationResolver.js.map
//# sourceMappingURL=baseConfigurationResolver.js.map
