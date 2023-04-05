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
exports.BrowserAttacher = void 0;
const inversify_1 = require("inversify");
const nls = __importStar(require("vscode-nls"));
const cancellation_1 = require("../../common/cancellation");
const events_1 = require("../../common/events");
const logging_1 = require("../../common/logging");
const promiseUtil_1 = require("../../common/promiseUtil");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
const urlUtils_1 = require("../../common/urlUtils");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const browserTargetManager_1 = require("./browserTargetManager");
const launcher = __importStar(require("./launcher"));
const localize = nls.loadMessageBundle();
let BrowserAttacher = class BrowserAttacher {
    constructor(logger, pathResolver, vscode) {
        this.logger = logger;
        this.pathResolver = pathResolver;
        this.vscode = vscode;
        this._disposables = [];
        this._onTerminatedEmitter = new events_1.EventEmitter();
        this.onTerminated = this._onTerminatedEmitter.event;
        this._onTargetListChangedEmitter = new events_1.EventEmitter();
        this.onTargetListChanged = this._onTargetListChangedEmitter.event;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        for (const disposable of this._disposables)
            disposable.dispose();
        this._disposables = [];
        if (this._attemptTimer)
            clearTimeout(this._attemptTimer);
        if (this._targetManager)
            this._targetManager.dispose();
    }
    /**
     * Returns whether the params is an attach configuration that this attacher can handle.
     */
    resolveParams(params) {
        return (params.request === 'attach' &&
            (params.type === "pwa-chrome" /* Chrome */ || params.type === "pwa-msedge" /* Edge */) &&
            params.browserAttachLocation === 'workspace');
    }
    /**
     * @inheritdoc
     */
    async launch(params, context) {
        const resolved = this.resolveParams(params);
        if (!resolved) {
            return { blockSessionTermination: false };
        }
        this._lastLaunchParams = Object.assign(Object.assign({}, params), { timeout: Infinity });
        await this.attemptToAttach(this._lastLaunchParams, context);
        return { blockSessionTermination: true };
    }
    /**
     * Schedules an attempt to reconnect after a short timeout.
     */
    _scheduleAttach(params, context) {
        this._attemptTimer = setTimeout(() => {
            this._attemptTimer = undefined;
            this.attemptToAttach(params, Object.assign(Object.assign({}, context), { cancellationToken: cancellation_1.NeverCancelled }));
        }, 1000);
    }
    /**
     * Creates the target manager for handling the given connection.
     */
    createTargetManager(connection, params, context) {
        return browserTargetManager_1.BrowserTargetManager.connect(connection, undefined, this.pathResolver, params, this.logger, context.telemetryReporter, context.targetOrigin);
    }
    /**
     * Attempts to attach to the target. Returns an error in a string if the
     * connection was not successful.
     */
    async attemptToAttach(params, context) {
        const connection = await this.acquireConnectionForBrowser(context, params);
        this._connection = connection;
        connection.onDisconnected(() => {
            this._connection = undefined;
            if (this._targetManager) {
                this._targetManager.dispose();
                this._targetManager = undefined;
                this._onTargetListChangedEmitter.fire();
            }
            if (this._lastLaunchParams === params && params.restart) {
                this._scheduleAttach(params, context);
            }
            else {
                this._onTerminatedEmitter.fire({ killed: true, code: 0 });
            }
        }, undefined, this._disposables);
        const targetManager = (this._targetManager = await this.createTargetManager(connection, params, context));
        if (!targetManager) {
            return;
        }
        targetManager.serviceWorkerModel.onDidChange(() => this._onTargetListChangedEmitter.fire());
        targetManager.frameModel.onFrameNavigated(() => this._onTargetListChangedEmitter.fire());
        targetManager.onTargetAdded(() => {
            this._onTargetListChangedEmitter.fire();
        });
        targetManager.onTargetRemoved(() => {
            this._onTargetListChangedEmitter.fire();
            if (!targetManager.targetList().length) {
                // graceful exit
                this._onTerminatedEmitter.fire({ killed: true, code: 0 });
            }
        });
        const result = await Promise.race([
            targetManager.waitForMainTarget(await this.getTargetFilter(targetManager, params)),
            promiseUtil_1.delay(params.timeout).then(() => {
                throw new protocolError_1.ProtocolError(errors_1.targetPageNotFound());
            }),
        ]);
        return typeof result === 'string' ? result : undefined;
    }
    /**
     * Gets the filter function to pick which target to attach to.
     */
    async getTargetFilter(manager, params) {
        const rawFilter = urlUtils_1.createTargetFilterForConfig(params);
        const baseFilter = urlUtils_1.requirePageTarget(rawFilter);
        if (params.targetSelection !== 'pick') {
            return baseFilter;
        }
        const targets = await manager.getCandiateInfo(baseFilter);
        if (targets.length === 0) {
            return baseFilter;
        }
        if (targets.length === 1 || !this.vscode) {
            return target => target.targetId === targets[0].targetId;
        }
        const placeHolder = localize('chrome.targets.placeholder', 'Select a tab');
        const selected = await this.vscode.window.showQuickPick(targets.map(target => ({
            label: target.title,
            detail: target.url,
            targetId: target.targetId,
        })), { matchOnDescription: true, matchOnDetail: true, placeHolder });
        if (!selected) {
            return baseFilter;
        }
        return target => target.targetId === selected.targetId;
    }
    /**
     * Gets a CDP connection to the browser.
     */
    async acquireConnectionForBrowser({ telemetryReporter, cancellationToken }, params) {
        while (this._lastLaunchParams === params) {
            try {
                return await this.acquireConnectionInner(telemetryReporter, params, cancellationToken);
            }
            catch (e) {
                if (cancellationToken.isCancellationRequested) {
                    throw new protocolError_1.ProtocolError(errors_1.browserAttachFailed(localize('attach.cannotConnect', 'Cannot connect to the target at {0}: {1}', `${params.address}:${params.port}`, e.message)));
                }
                await promiseUtil_1.delay(1000);
            }
        }
        throw new protocolError_1.ProtocolError(errors_1.browserAttachFailed(localize('attach.cannotConnect', 'Cannot connect to the target at {0}: {1}', `${params.address}:${params.port}`, 'Cancelled')));
    }
    /**
     * Inner method to get a CDP connection to the browser. May fail early, but
     * should throw if cancellation is required.
     */
    async acquireConnectionInner(rawTelemetryReporter, params, cancellationToken) {
        const browserURL = `http://${params.address}:${params.port}`;
        return await launcher.attach({ browserURL, inspectUri: params.inspectUri, pageURL: params.url }, cancellationToken, this.logger, rawTelemetryReporter);
    }
    async terminate() {
        var _a;
        this._lastLaunchParams = undefined;
        (_a = this._connection) === null || _a === void 0 ? void 0 : _a.close();
    }
    disconnect() {
        return this.terminate();
    }
    async restart() {
        // no-op
    }
    targetList() {
        const manager = this._targetManager;
        return manager ? manager.targetList() : [];
    }
};
BrowserAttacher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger)),
    __param(1, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(2, inversify_1.optional()), __param(2, inversify_1.inject(ioc_extras_1.VSCodeApi))
], BrowserAttacher);
exports.BrowserAttacher = BrowserAttacher;
//# sourceMappingURL=browserAttacher.js.map
//# sourceMappingURL=browserAttacher.js.map
