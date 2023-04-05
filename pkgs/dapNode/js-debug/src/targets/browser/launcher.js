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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attach = exports.defaultArgs = exports.launch = void 0;
const childProcess = __importStar(require("child_process"));
const fs_1 = require("fs");
const connection_1 = __importDefault(require("../../cdp/connection"));
const webSocketTransport_1 = require("../../cdp/webSocketTransport");
const environmentVars_1 = require("../../common/environmentVars");
const fsUtils_1 = require("../../common/fsUtils");
const promiseUtil_1 = require("../../common/promiseUtil");
const browserArgs_1 = require("./browserArgs");
const constructInspectorWSUri_1 = require("./constructInspectorWSUri");
const browserProcess_1 = require("./spawn/browserProcess");
const endpoints_1 = require("./spawn/endpoints");
const unelevatedChome_1 = require("./unelevatedChome");
const noop = () => undefined;
async function launch(dap, executablePath, logger, telemetryReporter, clientCapabilities, cancellationToken, options = {}) {
    var _a, _b;
    const { onStderr = noop, onStdout = noop, args = [], dumpio = false, cwd = process.cwd(), env = environmentVars_1.EnvironmentVars.empty, connection: defaultConnection = 'pipe', cleanUp = 'wholeBrowser', url, inspectUri, } = options;
    let browserArguments = new browserArgs_1.BrowserArgs(args);
    let actualConnection = browserArguments.getSuggestedConnection();
    if (actualConnection === undefined) {
        browserArguments = browserArguments.setConnection(defaultConnection);
        actualConnection = defaultConnection;
    }
    browserArguments = defaultArgs(browserArguments, options);
    let stdio = ['pipe', 'pipe', 'pipe'];
    if (actualConnection === 'pipe') {
        if (dumpio)
            stdio = ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'];
        else
            stdio = ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'];
    }
    let browserProcess;
    const launchUnelevated = !!(clientCapabilities.supportsLaunchUnelevatedProcessRequest && options.launchUnelevated);
    if (launchUnelevated && typeof actualConnection === 'number' && actualConnection !== 0) {
        await unelevatedChome_1.launchUnelevatedChrome(dap, executablePath, browserArguments.toArray(), cancellationToken);
        browserProcess = new browserProcess_1.NonTrackedBrowserProcess(logger);
    }
    else {
        const cp = childProcess.spawn(executablePath, browserArguments.toArray(), {
            detached: true,
            env: env.defined(),
            cwd: (await fsUtils_1.canAccess(fs_1.promises, cwd)) ? cwd : process.cwd(),
            stdio,
        });
        // If the PID is undefined, the launch failed; expect to see an error be
        // emitted presently, or just throw a generic error if not.
        if (cp.pid === undefined) {
            throw await Promise.race([
                promiseUtil_1.delay(1000).then(() => new Error('Unable to launch the executable (undefined pid)')),
                new Promise(r => cp.once('error', r)),
            ]);
        }
        browserProcess = new browserProcess_1.ChildProcessBrowserProcess(cp, logger);
    }
    if (dumpio) {
        (_a = browserProcess.stderr) === null || _a === void 0 ? void 0 : _a.on('data', d => onStderr(d.toString()));
        (_b = browserProcess.stdout) === null || _b === void 0 ? void 0 : _b.on('data', d => onStdout(d.toString()));
    }
    let exitListener = () => {
        if (cleanUp === 'wholeBrowser') {
            browserProcess.kill();
        }
    };
    process.on('exit', exitListener);
    browserProcess.onExit(() => process.removeListener('exit', exitListener));
    try {
        if (options.promisedPort) {
            actualConnection = await options.promisedPort;
        }
        const transport = await browserProcess.transport({
            connection: actualConnection,
            inspectUri: inspectUri || undefined,
            url: url || undefined,
        }, cancellationToken);
        const cdp = new connection_1.default(transport, logger, telemetryReporter);
        exitListener = async () => {
            if (cleanUp === 'wholeBrowser') {
                await cdp.rootSession().Browser.close({});
                browserProcess.kill();
            }
            else {
                cdp.close();
            }
        };
        return { cdp: cdp, process: browserProcess };
    }
    catch (e) {
        exitListener();
        throw e;
    }
}
exports.launch = launch;
function defaultArgs(defined, options = {}) {
    const { userDataDir = null, ignoreDefaultArgs = false } = options;
    let browserArguments = ignoreDefaultArgs === true ? new browserArgs_1.BrowserArgs() : browserArgs_1.BrowserArgs.default;
    if (ignoreDefaultArgs instanceof Array) {
        browserArguments = browserArguments.filter(key => !ignoreDefaultArgs.includes(key));
    }
    if (userDataDir) {
        browserArguments = browserArguments.add('--user-data-dir', userDataDir);
    }
    browserArguments = browserArguments.merge(defined);
    if (defined.toArray().every(arg => arg.startsWith('-')) && options.hasUserNavigation) {
        browserArguments = browserArguments.add('about:blank');
    }
    return browserArguments;
}
exports.defaultArgs = defaultArgs;
async function attach(options, cancellationToken, logger, telemetryReporter) {
    const { browserWSEndpoint, browserURL } = options;
    if (browserWSEndpoint) {
        const connectionTransport = await webSocketTransport_1.WebSocketTransport.create(browserWSEndpoint, cancellationToken);
        return new connection_1.default(connectionTransport, logger, telemetryReporter);
    }
    else if (browserURL) {
        const connectionURL = await endpoints_1.retryGetBrowserEndpoint(browserURL, cancellationToken, logger);
        const inspectWs = options.inspectUri
            ? constructInspectorWSUri_1.constructInspectorWSUri(options.inspectUri, options.pageURL, connectionURL)
            : connectionURL;
        const connectionTransport = await webSocketTransport_1.WebSocketTransport.create(inspectWs, cancellationToken);
        return new connection_1.default(connectionTransport, logger, telemetryReporter);
    }
    throw new Error('Either browserURL or browserWSEndpoint needs to be specified');
}
exports.attach = attach;
//# sourceMappingURL=launcher.js.map
//# sourceMappingURL=launcher.js.map
