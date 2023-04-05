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
exports.registerProfilingCommand = void 0;
const vscode = __importStar(require("vscode"));
const contributionUtils_1 = require("../common/contributionUtils");
const uiProfileManager_1 = require("./profiling/uiProfileManager");
exports.registerProfilingCommand = (context, container) => {
    const manager = container.get(uiProfileManager_1.UiProfileManager);
    context.subscriptions.push(contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.startProfile" /* StartProfile */, sessionIdOrArgs => manager.start(typeof sessionIdOrArgs === 'string'
        ? { sessionId: sessionIdOrArgs }
        : sessionIdOrArgs !== null && sessionIdOrArgs !== void 0 ? sessionIdOrArgs : {})), contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.stopProfile" /* StopProfile */, sessionId => manager.stop(sessionId)));
};
//# sourceMappingURL=profiling.js.map
//# sourceMappingURL=profiling.js.map
