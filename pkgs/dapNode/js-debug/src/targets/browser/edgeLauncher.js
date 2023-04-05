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
exports.EdgeLauncher = void 0;
const crypto_1 = require("crypto");
const inversify_1 = require("inversify");
const net_1 = require("net");
const os_1 = require("os");
const path_1 = require("path");
const vscode_js_debug_browsers_1 = require("vscode-js-debug-browsers");
const connection_1 = __importDefault(require("../../cdp/connection"));
const webSocketTransport_1 = require("../../cdp/webSocketTransport");
const cancellation_1 = require("../../common/cancellation");
const fsUtils_1 = require("../../common/fsUtils");
const logging_1 = require("../../common/logging");
const promiseUtil_1 = require("../../common/promiseUtil");
const sourcePathResolver_1 = require("../../common/sourcePathResolver");
const urlUtils_1 = require("../../common/urlUtils");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const browserLauncher_1 = require("./browserLauncher");
const defaultEdgeFlags = ['--do-not-de-elevate'];
let EdgeLauncher = class EdgeLauncher extends browserLauncher_1.BrowserLauncher {
    constructor(storagePath, logger, browserFinder, fs, pathResolver, initializeParams) {
        super(storagePath, logger, pathResolver, initializeParams);
        this.browserFinder = browserFinder;
        this.fs = fs;
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        return params.type === "pwa-msedge" /* Edge */ &&
            params.request === 'launch' &&
            params.browserLaunchLocation === 'workspace'
            ? params
            : undefined;
    }
    /**
     * @override
     */
    launchBrowser(params, dap, cancellationToken, telemetryReporter) {
        var _a;
        return super.launchBrowser(Object.assign(Object.assign({}, params), { runtimeArgs: (_a = params.runtimeArgs) !== null && _a !== void 0 ? _a : defaultEdgeFlags }), dap, cancellationToken, telemetryReporter, params.useWebView ? this.getWebviewPort(params, telemetryReporter) : undefined);
    }
    /**
     * If there's a urlFilter specifies for Edge webviews, use that and ignore
     * `about:blank`. It seems that webview2 always briefly navigates to
     * `about:blank`, which would cause us to attach to all webviews even when
     * we don't want to.
     * @override
     */
    getFilterForTarget(params) {
        return params.useWebView && params.urlFilter
            ? urlUtils_1.requirePageTarget(urlUtils_1.createTargetFilterForConfig(params))
            : super.getFilterForTarget(params);
    }
    /**
     * Gets the port number we should connect to to debug webviews in the target.
     */
    async getWebviewPort(params, telemetryReporter) {
        const promisedPort = promiseUtil_1.getDeferred();
        if (!params.runtimeExecutable) {
            // runtimeExecutable is required for web view debugging.
            promisedPort.resolve(params.port);
            return promisedPort.promise;
        }
        const exeName = params.runtimeExecutable.split(/\\|\//).pop();
        const pipeName = `VSCode_${crypto_1.randomBytes(12).toString('base64')}`;
        // This is a known pipe name scheme described in the web view documentation
        // https://docs.microsoft.com/microsoft-edge/hosting/webview2/reference/webview2.idl
        const serverName = `\\\\.\\pipe\\WebView2\\Debugger\\${exeName}\\${pipeName}`;
        const server = net_1.createServer(stream => {
            stream.on('data', async (data) => {
                const info = JSON.parse(data.toString());
                // devtoolsActivePort will always start with the port number
                // and look something like '92202\n ...'
                const dtString = info.devtoolsActivePort || '';
                const dtPort = parseInt(dtString.split('\n').shift() || '');
                const port = params.port || dtPort;
                promisedPort.resolve(port);
                // All web views started under our debugger are waiting to to be resumed.
                const wsURL = `ws://${params.address}:${port}/devtools/${info.type}/${info.id}`;
                const ws = await webSocketTransport_1.WebSocketTransport.create(wsURL, cancellation_1.NeverCancelled);
                const connection = new connection_1.default(ws, this.logger, telemetryReporter);
                await connection.rootSession().Runtime.runIfWaitingForDebugger({});
                connection.close();
            });
        });
        server.on('error', promisedPort.reject);
        server.on('close', () => promisedPort.resolve(params.port));
        server.listen(serverName);
        // We must set a user data directory so the DevToolsActivePort file will be written.
        // See: https://crrev.com//21e1940/content/public/browser/devtools_agent_host.h#99
        params.userDataDir =
            params.userDataDir || path_1.join(os_1.tmpdir(), `vscode-js-debug-userdatadir_${params.port}`);
        // Web views are indirectly configured for debugging with environment variables.
        // See the WebView2 documentation for more details.
        params.env = params.env || {};
        params.env['WEBVIEW2_USER_DATA_FOLDER'] = params.userDataDir.toString();
        params.env['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = `--remote-debugging-port=${params.port}`;
        params.env['WEBVIEW2_WAIT_FOR_SCRIPT_DEBUGGER'] = 'true';
        params.env['WEBVIEW2_PIPE_FOR_SCRIPT_DEBUGGER'] = pipeName;
        return promisedPort.promise;
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
            throw new protocolError_1.ProtocolError(errors_1.browserNotFound('Edge', executablePath, (await this.browserFinder.findAll()).map(b => b.quality)));
        }
        return resolvedPath;
    }
};
EdgeLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.StoragePath)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(ioc_extras_1.BrowserFinder)),
    __param(2, inversify_1.tagged('browser', 'edge')),
    __param(3, inversify_1.inject(ioc_extras_1.FS)),
    __param(4, inversify_1.inject(sourcePathResolver_1.ISourcePathResolver)),
    __param(5, inversify_1.inject(ioc_extras_1.IInitializeParams))
], EdgeLauncher);
exports.EdgeLauncher = EdgeLauncher;
//# sourceMappingURL=edgeLauncher.js.map
//# sourceMappingURL=edgeLauncher.js.map
