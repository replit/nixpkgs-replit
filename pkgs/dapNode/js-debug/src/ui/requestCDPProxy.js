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
exports.registerRequestCDPProxy = void 0;
const vscode = __importStar(require("vscode"));
const contributionUtils_1 = require("../common/contributionUtils");
exports.registerRequestCDPProxy = (context, tracker) => {
    context.subscriptions.push(contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.requestCDPProxy" /* RequestCDPProxy */, async (sessionId) => {
        const session = tracker.getById(sessionId);
        return await (session === null || session === void 0 ? void 0 : session.customRequest('requestCDPProxy'));
    }));
};
//# sourceMappingURL=requestCDPProxy.js.map
//# sourceMappingURL=requestCDPProxy.js.map
