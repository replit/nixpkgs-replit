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
exports.ChildProcessBrowserProcess = exports.NonTrackedBrowserProcess = void 0;
const readline = __importStar(require("readline"));
const rawPipeTransport_1 = require("../../../cdp/rawPipeTransport");
const webSocketTransport_1 = require("../../../cdp/webSocketTransport");
const cancellation_1 = require("../../../common/cancellation");
const disposable_1 = require("../../../common/disposable");
const events_1 = require("../../../common/events");
const promiseUtil_1 = require("../../../common/promiseUtil");
const killTree_1 = require("../../node/killTree");
const constructInspectorWSUri_1 = require("../constructInspectorWSUri");
const endpoints_1 = require("./endpoints");
const inspectWsConnection = async (logger, process, options, cancellationToken) => {
    const endpoint = options.connection === 0
        ? await waitForWSEndpoint(process, cancellationToken)
        : await endpoints_1.retryGetBrowserEndpoint(`http://localhost:${options.connection}`, cancellationToken, logger);
    const inspectWs = options.inspectUri
        ? constructInspectorWSUri_1.constructInspectorWSUri(options.inspectUri, options.url, endpoint)
        : endpoint;
    while (true) {
        try {
            return await webSocketTransport_1.WebSocketTransport.create(inspectWs, cancellationToken);
        }
        catch (e) {
            if (cancellationToken.isCancellationRequested) {
                throw e;
            }
            await promiseUtil_1.delay(200);
        }
    }
};
class NonTrackedBrowserProcess {
    constructor(logger) {
        this.logger = logger;
        this.pid = undefined;
        this.onExit = new events_1.EventEmitter().event;
        this.onError = new events_1.EventEmitter().event;
    }
    /**
     * @inheritdoc
     */
    async transport(options, cancellationToken) {
        return inspectWsConnection(this.logger, this, options, cancellationToken);
    }
    /**
     * @inheritdoc
     */
    kill() {
        // noop
    }
}
exports.NonTrackedBrowserProcess = NonTrackedBrowserProcess;
/**
 * Browser process
 */
class ChildProcessBrowserProcess {
    constructor(cp, logger) {
        this.cp = cp;
        this.logger = logger;
        this.pid = undefined;
        this.exitEmitter = new events_1.EventEmitter();
        this.onExit = this.exitEmitter.event;
        this.errorEmitter = new events_1.EventEmitter();
        this.onError = this.errorEmitter.event;
        cp.on('exit', code => this.exitEmitter.fire(code || 0));
        cp.on('error', error => this.errorEmitter.fire(error));
    }
    get stderr() {
        return this.cp.stderr;
    }
    get stdio() {
        return this.cp.stdio;
    }
    /**
     * @inheritdoc
     */
    async transport(options, cancellationToken) {
        if (options.connection === 'pipe') {
            return new rawPipeTransport_1.RawPipeTransport(this.logger, this.cp.stdio[3], this.cp.stdio[4]);
        }
        return inspectWsConnection(this.logger, this, options, cancellationToken);
    }
    /**
     * @inheritdoc
     */
    kill() {
        killTree_1.killTree(this.cp.pid, this.logger);
    }
}
exports.ChildProcessBrowserProcess = ChildProcessBrowserProcess;
function waitForWSEndpoint(browserProcess, cancellationToken) {
    if (!browserProcess.stderr) {
        throw new Error('Cannot wait for a websocket for a target that lacks stderr');
    }
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rl = readline.createInterface({ input: browserProcess.stderr });
        let stderr = '';
        const onClose = () => onDone();
        rl.on('line', onLine);
        rl.on('close', onClose);
        const disposable = new disposable_1.DisposableList([
            browserProcess.onExit(() => onDone()),
            browserProcess.onError(onDone),
        ]);
        const timeout = cancellationToken.onCancellationRequested(() => {
            cleanup();
            reject(new cancellation_1.TaskCancelledError(`Timed out after ${timeout} ms while trying to connect to the browser!`));
        });
        function onDone(error) {
            cleanup();
            reject(new Error([
                'Failed to launch browser!' + (error ? ' ' + error.message : ''),
                stderr,
                '',
                'TROUBLESHOOTING: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md',
                '',
            ].join('\n')));
        }
        function onLine(line) {
            stderr += line + '\n';
            const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
            if (!match)
                return;
            cleanup();
            resolve(match[1]);
        }
        function cleanup() {
            timeout.dispose();
            rl.removeListener('line', onLine);
            rl.removeListener('close', onClose);
            disposable.dispose();
        }
    });
}
//# sourceMappingURL=browserProcess.js.map
//# sourceMappingURL=browserProcess.js.map
