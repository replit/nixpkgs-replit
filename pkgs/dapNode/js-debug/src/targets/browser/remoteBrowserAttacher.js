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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteBrowserAttacher = void 0;
const inversify_1 = require("inversify");
const connection_1 = __importDefault(require("../../cdp/connection"));
const logging_1 = require("../../common/logging");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
const ioc_extras_1 = require("../../ioc-extras");
const browserAttacher_1 = require("./browserAttacher");
const remoteBrowserHelper_1 = require("./remoteBrowserHelper");
let RemoteBrowserAttacher = class RemoteBrowserAttacher extends browserAttacher_1.BrowserAttacher {
    constructor(helper, logger, pathResolver, vscode) {
        super(logger, pathResolver, vscode);
        this.helper = helper;
    }
    /**
     * @override
     */
    resolveParams(params) {
        return (params.request === 'attach' &&
            (params.type === "pwa-chrome" /* Chrome */ || params.type === "pwa-msedge" /* Edge */) &&
            params.browserAttachLocation === 'ui');
    }
    /**
     * @override
     */
    async acquireConnectionForBrowser(context, params) {
        const transport = await this.helper.launch(context.dap, context.cancellationToken, {
            type: params.type === "pwa-chrome" /* Chrome */ ? 'chrome' : 'edge',
            params,
            attach: {
                host: params.address,
                port: params.port,
            },
        });
        return new connection_1.default(transport, this.logger, context.telemetryReporter);
    }
};
RemoteBrowserAttacher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(remoteBrowserHelper_1.RemoteBrowserHelper)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(3, inversify_1.optional()), __param(3, inversify_1.inject(ioc_extras_1.VSCodeApi))
], RemoteBrowserAttacher);
exports.RemoteBrowserAttacher = RemoteBrowserAttacher;
//# sourceMappingURL=remoteBrowserAttacher.js.map
//# sourceMappingURL=remoteBrowserAttacher.js.map
