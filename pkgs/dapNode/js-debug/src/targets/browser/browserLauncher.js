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
exports.BrowserLauncher = void 0;
const fs = __importStar(require("fs"));
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const cancellation_1 = require("../../common/cancellation");
const disposable_1 = require("../../common/disposable");
const environmentVars_1 = require("../../common/environmentVars");
const events_1 = require("../../common/events");
const logging_1 = require("../../common/logging");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
const urlUtils_1 = require("../../common/urlUtils");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const browserTargetManager_1 = require("./browserTargetManager");
const launcher = __importStar(require("./launcher"));
let BrowserLauncher = class BrowserLauncher {
    constructor(storagePath, logger, pathResolver, initializeParams) {
        this.storagePath = storagePath;
        this.logger = logger;
        this.pathResolver = pathResolver;
        this.initializeParams = initializeParams;
        this._disposables = new disposable_1.DisposableList();
        this._terminated = false;
        this._onTerminatedEmitter = new events_1.EventEmitter();
        this.onTerminated = this._onTerminatedEmitter.event;
        this._onTargetListChangedEmitter = new events_1.EventEmitter();
        this.onTargetListChanged = this._onTargetListChangedEmitter.event;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this._disposables.dispose();
    }
    async launchBrowser({ runtimeExecutable: executable, trace, includeDefaultArgs, runtimeArgs, userDataDir, env, cwd, port, url, file, inspectUri, webRoot, cleanUp, launchUnelevated: launchUnelevated, }, dap, cancellationToken, telemetryReporter, promisedPort) {
        const executablePath = await this.findBrowserPath(executable || "stable" /* Stable */);
        // If we had a custom executable, don't resolve a data
        // dir unless it's  explicitly requested.
        let resolvedDataDir;
        if (typeof userDataDir === 'string') {
            resolvedDataDir = userDataDir;
        }
        else if (userDataDir) {
            resolvedDataDir = path.join(this.storagePath, (runtimeArgs === null || runtimeArgs === void 0 ? void 0 : runtimeArgs.includes('--headless')) ? '.headless-profile' : '.profile');
        }
        try {
            fs.mkdirSync(this.storagePath);
        }
        catch (e) { }
        return await launcher.launch(dap, executablePath, this.logger, telemetryReporter, this.initializeParams, cancellationToken, {
            onStdout: output => dap.output({ category: 'stdout', output }),
            onStderr: output => dap.output({ category: 'stderr', output }),
            dumpio: typeof trace === 'boolean' ? trace : trace.stdio,
            cleanUp,
            hasUserNavigation: !!(url || file),
            cwd: cwd || webRoot || undefined,
            env: environmentVars_1.EnvironmentVars.merge(environmentVars_1.EnvironmentVars.processEnv(), env),
            args: runtimeArgs || [],
            userDataDir: resolvedDataDir,
            connection: port || (inspectUri ? 0 : 'pipe'),
            launchUnelevated: launchUnelevated,
            ignoreDefaultArgs: !includeDefaultArgs,
            url,
            inspectUri,
            promisedPort,
        });
    }
    getFilterForTarget(params) {
        return urlUtils_1.requirePageTarget(urlUtils_1.createTargetFilterForConfig(params, ['about:blank']));
    }
    /**
     * Starts the launch process. It boots the browser and waits until the target
     * page is available, and then returns the newly-created target.
     */
    async prepareLaunch(params, { dap, targetOrigin, cancellationToken, telemetryReporter }) {
        let launched;
        try {
            launched = await this.launchBrowser(params, dap, cancellationToken, telemetryReporter);
        }
        catch (e) {
            throw new protocolError_1.ProtocolError(errors_1.browserLaunchFailed(e));
        }
        this._disposables.push(launched.cdp.onDisconnected(() => this.fireTerminatedEvent()));
        this._connectionForTest = launched.cdp;
        this._launchParams = params;
        this._targetManager = await browserTargetManager_1.BrowserTargetManager.connect(launched.cdp, launched.process, this.pathResolver, this._launchParams, this.logger, telemetryReporter, targetOrigin);
        if (!this._targetManager) {
            launched.process.kill();
            throw new protocolError_1.ProtocolError(errors_1.browserAttachFailed());
        }
        this._targetManager.serviceWorkerModel.onDidChange(() => this._onTargetListChangedEmitter.fire());
        this._targetManager.frameModel.onFrameNavigated(() => this._onTargetListChangedEmitter.fire());
        this._disposables.push(this._targetManager);
        this._targetManager.onTargetAdded(() => {
            this._onTargetListChangedEmitter.fire();
        });
        this._targetManager.onTargetRemoved(() => {
            this._onTargetListChangedEmitter.fire();
        });
        // Note: assuming first page is our main target breaks multiple debugging sessions
        // sharing the browser instance. This can be fixed.
        const filter = this.getFilterForTarget(params);
        const mainTarget = await cancellation_1.timeoutPromise(this._targetManager.waitForMainTarget(filter), cancellationToken, 'Could not attach to main target');
        if (!mainTarget) {
            launched.process.kill(); // no need to check the `cleanUp` preference since no tabs will be open
            throw new protocolError_1.ProtocolError(errors_1.targetPageNotFound());
        }
        return mainTarget;
    }
    /**
     * Finalizes the launch after a page is available, navigating to the
     * requested URL.
     */
    async finishLaunch(mainTarget, params) {
        if ('skipNavigateForTest' in params) {
            return;
        }
        const url = 'file' in params && params.file
            ? urlUtils_1.absolutePathToFileUrl(path.resolve(params.webRoot || params.rootPath || '', params.file))
            : params.url;
        if (url) {
            await mainTarget.cdp().Page.navigate({ url });
        }
    }
    /**
     * @inheritdoc
     */
    async launch(params, context) {
        const resolved = this.resolveParams(params);
        if (!resolved) {
            return { blockSessionTermination: false };
        }
        const target = await this.prepareLaunch(resolved, context);
        await this.finishLaunch(target, resolved);
        return { blockSessionTermination: true };
    }
    /**
     * @inheritdoc
     */
    async terminate() {
        for (const target of this.targetList()) {
            if (target.type() === "page" /* Page */) {
                await target.cdp().Page.close({});
            }
        }
    }
    /**
     * @inheritdoc
     */
    async disconnect() {
        var _a;
        await ((_a = this._targetManager) === null || _a === void 0 ? void 0 : _a.closeBrowser());
    }
    /**
     * @inheritdoc
     */
    async restart() {
        var _a;
        const mainTarget = this.targetList().find(t => t.type() === "page" /* Page */);
        if (!mainTarget) {
            return;
        }
        const cdp = mainTarget.cdp();
        if ((_a = this._launchParams) === null || _a === void 0 ? void 0 : _a.url) {
            await cdp.Page.navigate({ url: this._launchParams.url });
        }
        else {
            await cdp.Page.reload({});
        }
        cdp.Page.bringToFront({});
    }
    targetList() {
        const manager = this._targetManager;
        return manager ? manager.targetList() : [];
    }
    connectionForTest() {
        return this._connectionForTest;
    }
    fireTerminatedEvent() {
        if (!this._terminated) {
            this._terminated = true;
            this._onTerminatedEmitter.fire({ code: 0, killed: true });
        }
    }
};
BrowserLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.StoragePath)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(3, inversify_1.inject(ioc_extras_1.IInitializeParams))
], BrowserLauncher);
exports.BrowserLauncher = BrowserLauncher;
//# sourceMappingURL=browserLauncher.js.map
//# sourceMappingURL=browserLauncher.js.map
