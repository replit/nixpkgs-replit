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
exports.LinkedBreakpointLocationUI = void 0;
const inversify_1 = require("inversify");
const nls = __importStar(require("vscode-nls"));
const ioc_extras_1 = require("../ioc-extras");
const localize = nls.loadMessageBundle();
const ignoreStorageKey = 'linkBpWarnIgnored';
const docLink = 'https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_can-i-debug-if-im-using-symlinks';
let LinkedBreakpointLocationUI = class LinkedBreakpointLocationUI {
    constructor(vscode, context) {
        this.vscode = vscode;
        this.context = context;
        this.didWarn = this.context.workspaceState.get(ignoreStorageKey, false);
    }
    async warn() {
        if (this.didWarn) {
            return;
        }
        this.didWarn = true;
        const readMore = localize('readMore', 'Read More');
        const ignore = localize('ignore', 'Ignore');
        const r = await this.vscode.window.showWarningMessage('It looks like you have symlinked files. You might need to update your configuration to make this work as expected.', ignore, readMore);
        if (r === ignore) {
            this.context.workspaceState.update(ignoreStorageKey, true);
        }
        else if (r === readMore) {
            this.vscode.env.openExternal(this.vscode.Uri.parse(docLink));
        }
    }
};
LinkedBreakpointLocationUI = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.VSCodeApi)),
    __param(1, inversify_1.inject(ioc_extras_1.ExtensionContext))
], LinkedBreakpointLocationUI);
exports.LinkedBreakpointLocationUI = LinkedBreakpointLocationUI;
//# sourceMappingURL=linkedBreakpointLocationUI.js.map
//# sourceMappingURL=linkedBreakpointLocationUI.js.map
