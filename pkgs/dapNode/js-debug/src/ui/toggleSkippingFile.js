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
exports.toggleSkippingFile = void 0;
const vscode = __importStar(require("vscode"));
const url_1 = require("url");
const urlUtils_1 = require("../common/urlUtils");
async function toggleSkippingFile(aPath) {
    if (!aPath) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor)
            return;
        aPath = activeEditor && activeEditor.document.fileName;
    }
    if (aPath && vscode.debug.activeDebugSession) {
        let args;
        if (typeof aPath === 'string') {
            if (urlUtils_1.isFileUrl(aPath)) {
                args = { resource: url_1.fileURLToPath(aPath) };
            }
            else {
                args = { resource: aPath };
            }
        }
        else {
            args = { sourceReference: aPath };
        }
        await vscode.debug.activeDebugSession.customRequest('toggleSkipFileStatus', args);
    }
}
exports.toggleSkippingFile = toggleSkippingFile;
//# sourceMappingURL=toggleSkippingFile.js.map
//# sourceMappingURL=toggleSkippingFile.js.map
