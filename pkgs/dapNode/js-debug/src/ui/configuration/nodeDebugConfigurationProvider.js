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
exports.NodeDynamicDebugConfigurationProvider = exports.NodeInitialDebugConfigurationProvider = void 0;
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const objUtils_1 = require("../../common/objUtils");
const configuration_1 = require("../../configuration");
const debugNpmScript_1 = require("../debugNpmScript");
const getRunScriptCommand_1 = require("../getRunScriptCommand");
const baseConfigurationProvider_1 = require("./baseConfigurationProvider");
const nodeDebugConfigurationResolver_1 = require("./nodeDebugConfigurationResolver");
const localize = nls.loadMessageBundle();
let NodeInitialDebugConfigurationProvider = class NodeInitialDebugConfigurationProvider extends baseConfigurationProvider_1.BaseConfigurationProvider {
    provide(folder) {
        return nodeDebugConfigurationResolver_1.createLaunchConfigFromContext(folder, true);
    }
    getType() {
        return "pwa-node" /* Node */;
    }
    getTriggerKind() {
        return vscode.DebugConfigurationProviderTriggerKind.Initial;
    }
};
NodeInitialDebugConfigurationProvider = __decorate([
    inversify_1.injectable()
], NodeInitialDebugConfigurationProvider);
exports.NodeInitialDebugConfigurationProvider = NodeInitialDebugConfigurationProvider;
const keysToRelativize = ['cwd', 'program'];
let NodeDynamicDebugConfigurationProvider = class NodeDynamicDebugConfigurationProvider extends baseConfigurationProvider_1.BaseConfigurationProvider {
    async provide(folder) {
        const configs = objUtils_1.flatten(await Promise.all([this.getFromNpmScripts(folder), this.getFromActiveFile()]));
        // convert any absolute paths to directories or files to nicer ${workspaceFolder}-based paths
        if (folder) {
            for (const configRaw of configs) {
                const config = configRaw;
                for (const key of keysToRelativize) {
                    const value = config[key];
                    if (value && path.isAbsolute(value)) {
                        config[key] = path.join('${workspaceFolder}', path.relative(folder.uri.fsPath, value));
                    }
                }
            }
        }
        return configs;
    }
    getType() {
        return "pwa-node" /* Node */;
    }
    getTriggerKind() {
        return vscode.DebugConfigurationProviderTriggerKind.Dynamic;
    }
    /**
     * Adds suggestions discovered from npm scripts.
     */
    async getFromNpmScripts(folder) {
        const openTerminal = {
            type: "node-terminal" /* Terminal */,
            name: localize('debug.terminal.label', 'JavaScript Debug Terminal'),
            request: 'launch',
            cwd: folder === null || folder === void 0 ? void 0 : folder.uri.fsPath,
        };
        if (!folder) {
            return [openTerminal];
        }
        const scripts = await debugNpmScript_1.findScripts([folder.uri.fsPath], true);
        if (!scripts) {
            return [openTerminal];
        }
        const packageManager = await getRunScriptCommand_1.getPackageManager(folder);
        return scripts
            .map(script => ({
            type: "node-terminal" /* Terminal */,
            name: localize('node.launch.script', 'Run Script: {0}', script.name),
            request: 'launch',
            command: `${packageManager} run ${script.name}`,
            cwd: script.directory,
        }))
            .concat(openTerminal);
    }
    /**
     * Adds a suggestion to run the active file, if it's debuggable.
     */
    getFromActiveFile() {
        const editor = vscode.window.activeTextEditor;
        if (!editor ||
            !configuration_1.breakpointLanguages.includes(editor.document.languageId) ||
            editor.document.uri.scheme !== 'file') {
            return [];
        }
        return [
            {
                type: "pwa-node" /* Node */,
                name: localize('node.launch.currentFile', 'Run Current File'),
                request: 'launch',
                program: editor.document.uri.fsPath,
            },
        ];
    }
};
NodeDynamicDebugConfigurationProvider = __decorate([
    inversify_1.injectable()
], NodeDynamicDebugConfigurationProvider);
exports.NodeDynamicDebugConfigurationProvider = NodeDynamicDebugConfigurationProvider;
//# sourceMappingURL=nodeDebugConfigurationProvider.js.map
//# sourceMappingURL=nodeDebugConfigurationProvider.js.map
