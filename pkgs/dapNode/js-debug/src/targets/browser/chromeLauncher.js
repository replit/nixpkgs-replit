"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromeLauncher = void 0;
const inversify_1 = require("inversify");
const browserLauncher_1 = require("./browserLauncher");
const ioc_extras_1 = require("../../ioc-extras");
const logging_1 = require("../../common/logging");
const fsUtils_1 = require("../../common/fsUtils");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const vscode_js_debug_browsers_1 = require("vscode-js-debug-browsers");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
let ChromeLauncher = class ChromeLauncher extends browserLauncher_1.BrowserLauncher {
    constructor(storagePath, logger, browserFinder, fs, pathResolver, initializeParams) {
        super(storagePath, logger, pathResolver, initializeParams);
        this.browserFinder = browserFinder;
        this.fs = fs;
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        return params.type === "pwa-chrome" /* Chrome */ &&
            params.request === 'launch' &&
            params.browserLaunchLocation === 'workspace'
            ? params
            : undefined;
    }
    /**
     * @inheritdoc
     */
    async findBrowserPath(executablePath) {
        let resolvedPath;
        if (vscode_js_debug_browsers_1.isQuality(executablePath)) {
            const found = await this.browserFinder.findWhere(r => r.quality === executablePath);
            resolvedPath = found === null || found === void 0 ? void 0 : found.path;
        }
        else {
            resolvedPath = executablePath;
        }
        if (!resolvedPath || !(await fsUtils_1.canAccess(this.fs, resolvedPath))) {
            throw new protocolError_1.ProtocolError(errors_1.browserNotFound('Chrome', executablePath, (await this.browserFinder.findAll()).map(b => b.quality)));
        }
        return resolvedPath;
    }
};
ChromeLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.StoragePath)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(ioc_extras_1.BrowserFinder)),
    __param(2, inversify_1.tagged('browser', 'chrome')),
    __param(3, inversify_1.inject(ioc_extras_1.FS)),
    __param(4, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(5, inversify_1.inject(ioc_extras_1.IInitializeParams))
], ChromeLauncher);
exports.ChromeLauncher = ChromeLauncher;
//# sourceMappingURL=chromeLauncher.js.map
//# sourceMappingURL=chromeLauncher.js.map
