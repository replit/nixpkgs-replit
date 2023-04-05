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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalDebugConfigurationResolver = void 0;
const vscode = __importStar(require("vscode"));
const configuration_1 = require("../../configuration");
const baseConfigurationResolver_1 = require("./baseConfigurationResolver");
const nodeDebugConfigurationResolver_1 = require("./nodeDebugConfigurationResolver");
const contributionUtils_1 = require("../../common/contributionUtils");
/**
 * Configuration provider for node debugging. In order to allow for a
 * close to 1:1 drop-in, this is nearly identical to the original vscode-
 * node-debug, with support for some legacy options (mern, useWSL) removed.
 */
class TerminalDebugConfigurationResolver extends baseConfigurationResolver_1.BaseConfigurationResolver {
    async resolveDebugConfigurationAsync(folder, config) {
        if (!config.cwd) {
            config.cwd = nodeDebugConfigurationResolver_1.guessWorkingDirectory(undefined, folder);
        }
        if (config.request === 'launch' && !config.command) {
            await contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.createDebuggerTerminal" /* CreateDebuggerTerminal */, undefined, folder);
            return undefined;
        }
        // if a 'remoteRoot' is specified without a corresponding 'localRoot', set 'localRoot' to the workspace folder.
        // see https://github.com/Microsoft/vscode/issues/63118
        if (config.remoteRoot && !config.localRoot) {
            config.localRoot = '${workspaceFolder}';
        }
        return Object.assign(Object.assign({}, configuration_1.terminalBaseDefaults), config);
    }
    getType() {
        return "node-terminal" /* Terminal */;
    }
}
exports.TerminalDebugConfigurationResolver = TerminalDebugConfigurationResolver;
//# sourceMappingURL=terminalDebugConfigurationResolver.js.map
//# sourceMappingURL=terminalDebugConfigurationResolver.js.map
