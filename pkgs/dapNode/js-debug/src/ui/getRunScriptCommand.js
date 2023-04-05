"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRunScriptCommand = exports.getPackageManager = void 0;
const vscode_1 = require("vscode");
/**
 * Gets the package manager the user configured in the folder.
 */
exports.getPackageManager = async (folder) => {
    try {
        return await vscode_1.commands.executeCommand('npm.packageManager', folder === null || folder === void 0 ? void 0 : folder.uri);
    }
    catch (_a) {
        return 'npm';
    }
};
/**
 * Gets a command to run a script
 */
exports.getRunScriptCommand = async (name, folder) => `${await exports.getPackageManager(folder)} run ${name}`;
//# sourceMappingURL=getRunScriptCommand.js.map
//# sourceMappingURL=getRunScriptCommand.js.map
