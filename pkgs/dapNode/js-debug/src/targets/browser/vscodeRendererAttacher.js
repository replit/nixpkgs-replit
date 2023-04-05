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
var VSCodeRendererAttacher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeRendererAttacher = void 0;
const inversify_1 = require("inversify");
const net_1 = require("net");
const connection_1 = __importDefault(require("../../cdp/connection"));
const rawPipeTransport_1 = require("../../cdp/rawPipeTransport");
const disposable_1 = require("../../common/disposable");
const logging_1 = require("../../common/logging");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
const urlUtils_1 = require("../../common/urlUtils");
const configuration_1 = require("../../configuration");
const sourcePathResolverFactory_1 = require("../sourcePathResolverFactory");
const browserAttacher_1 = require("./browserAttacher");
const vscodeRendererTargetManager_1 = require("./vscodeRendererTargetManager");
let VSCodeRendererAttacher = VSCodeRendererAttacher_1 = class VSCodeRendererAttacher extends browserAttacher_1.BrowserAttacher {
    constructor(logger, pathResolver, pathResolverFactory) {
        super(logger, pathResolver);
        this.pathResolverFactory = pathResolverFactory;
    }
    /**
     * @override
     */
    async launch(params, context) {
        if (params.type !== "pwa-extensionHost" /* ExtensionHost */ || params.request !== 'attach') {
            return { blockSessionTermination: false };
        }
        const rendererPort = VSCodeRendererAttacher_1.debugIdToRendererDebugPort.get(params.__sessionId);
        if (!rendererPort) {
            return { blockSessionTermination: false };
        }
        const configuration = configuration_1.applyDefaults(Object.assign({ name: 'Webview', type: "pwa-chrome" /* Chrome */, request: 'attach', port: rendererPort, __workspaceFolder: params.__workspaceFolder, urlFilter: '' }, params.rendererDebugOptions));
        configuration.__sessionId = params.__sessionId;
        configuration.debugWebWorkerExtHost = params.debugWebWorkerHost;
        configuration.debugWebviews = params.debugWebviews;
        super
            .launch(configuration, context)
            .catch(err => this.logger.error("runtime.exception" /* RuntimeException */, 'Error in webview attach', { err }));
        return { blockSessionTermination: false };
    }
    /**
     * @override
     */
    async acquireConnectionInner(telemetryReporter, params, cancellationToken) {
        const disposable = new disposable_1.DisposableList();
        const pipe = await new Promise((resolve, reject) => {
            const p = net_1.createConnection({ port: params.port }, () => resolve(p));
            p.on('error', reject);
            disposable.push(cancellationToken.onCancellationRequested(() => {
                p.destroy();
                reject(new Error('connection timed out'));
            }));
        }).finally(() => disposable.dispose());
        return new connection_1.default(new rawPipeTransport_1.RawPipeTransport(this.logger, pipe), this.logger, telemetryReporter);
    }
    async getTargetFilter(_manager, params) {
        const baseFilter = urlUtils_1.createTargetFilterForConfig(params);
        return target => {
            if (params.debugWebWorkerExtHost &&
                target.type === "worker" /* Worker */ &&
                target.title === 'WorkerExtensionHost') {
                return true;
            }
            if (params.debugWebviews && target.type === "iframe" /* IFrame */ && baseFilter(target)) {
                return true;
            }
            return false;
        };
    }
    /**
     * @override
     */
    async createTargetManager(connection, params, context) {
        return new vscodeRendererTargetManager_1.VSCodeRendererTargetManager(connection, undefined, connection.rootSession(), this.pathResolverFactory.create(params, this.logger), this.logger, context.telemetryReporter, params, context.targetOrigin);
    }
};
/**
 * Map of debug IDs to ports the renderer is listening on,
 * set from the {@see ExtensionHostLauncher}.
 */
VSCodeRendererAttacher.debugIdToRendererDebugPort = new Map();
VSCodeRendererAttacher = VSCodeRendererAttacher_1 = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger)),
    __param(1, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(2, inversify_1.inject(sourcePathResolverFactory_1.ISourcePathResolverFactory))
], VSCodeRendererAttacher);
exports.VSCodeRendererAttacher = VSCodeRendererAttacher;
//# sourceMappingURL=vscodeRendererAttacher.js.map
//# sourceMappingURL=vscodeRendererAttacher.js.map
