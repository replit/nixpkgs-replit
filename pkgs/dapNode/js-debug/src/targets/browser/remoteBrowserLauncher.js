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
exports.RemoteBrowserLauncher = void 0;
const inversify_1 = require("inversify");
const connection_1 = __importDefault(require("../../cdp/connection"));
const events_1 = require("../../common/events");
const logging_1 = require("../../common/logging");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
const ioc_extras_1 = require("../../ioc-extras");
const browserArgs_1 = require("./browserArgs");
const browserLauncher_1 = require("./browserLauncher");
const launcher_1 = require("./launcher");
const remoteBrowserHelper_1 = require("./remoteBrowserHelper");
let RemoteBrowserLauncher = class RemoteBrowserLauncher extends browserLauncher_1.BrowserLauncher {
    constructor(storagePath, logger, pathResolver, initializeParams, helper) {
        super(storagePath, logger, pathResolver, initializeParams);
        this.helper = helper;
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        return (params.type === "pwa-chrome" /* Chrome */ || params.type === "pwa-msedge" /* Edge */) &&
            params.request === 'launch' &&
            params.browserLaunchLocation === 'ui'
            ? params
            : undefined;
    }
    /**
     * @override
     */
    async launchBrowser(params, dap, cancellationToken, telemetryReporter) {
        const transport = await this.helper.launch(dap, cancellationToken, {
            type: params.type === "pwa-chrome" /* Chrome */ ? 'chrome' : 'edge',
            browserArgs: launcher_1.defaultArgs(new browserArgs_1.BrowserArgs(params.runtimeArgs || []), {
                hasUserNavigation: !!params.url,
                ignoreDefaultArgs: !params.includeDefaultArgs,
            })
                .setConnection(params.port || 'pipe')
                .toArray(),
            params,
        });
        return {
            cdp: new connection_1.default(transport, this.logger, telemetryReporter),
            process: {
                onExit: new events_1.EventEmitter().event,
                onError: new events_1.EventEmitter().event,
                transport: () => Promise.resolve(transport),
                kill: () => this.helper.close(transport),
            },
        };
    }
    /**
     * @inheritdoc
     */
    async findBrowserPath() {
        throw new Error('not implemented');
    }
};
RemoteBrowserLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.StoragePath)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(3, inversify_1.inject(ioc_extras_1.IInitializeParams)),
    __param(4, inversify_1.inject(remoteBrowserHelper_1.RemoteBrowserHelper))
], RemoteBrowserLauncher);
exports.RemoteBrowserLauncher = RemoteBrowserLauncher;
//# sourceMappingURL=remoteBrowserLauncher.js.map
//# sourceMappingURL=remoteBrowserLauncher.js.map
