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
exports.startDebugServer = void 0;
const ioc_1 = require("./ioc");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const net = __importStar(require("net"));
const binder_1 = require("./binder");
const connection_1 = __importDefault(require("./dap/connection"));
const nls = __importStar(require("vscode-nls"));
const targetOrigin_1 = require("./targets/targetOrigin");
const logging_1 = require("./common/logging");
const transport_1 = require("./dap/transport");
const localize = nls.loadMessageBundle();
const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-js-debug-'));
class Configurator {
    constructor(dapPromise) {
        this._customBreakpoints = new Set();
        this.lastBreakpointId = 0;
        this._setBreakpointsParams = [];
        dapPromise.then(dap => this._listen(dap));
    }
    _listen(dap) {
        dap.on('setBreakpoints', async (params) => {
            var _a, _b;
            const ids = (_b = (_a = params.breakpoints) === null || _a === void 0 ? void 0 : _a.map(() => ++this.lastBreakpointId)) !== null && _b !== void 0 ? _b : [];
            this._setBreakpointsParams.push({ params, ids });
            const breakpoints = ids.map(id => ({
                id,
                verified: false,
                message: localize('breakpoint.provisionalBreakpoint', `Unbound breakpoint`),
            })); // TODO: Put a useful message here
            return { breakpoints };
        });
        dap.on('setExceptionBreakpoints', async (params) => {
            this._setExceptionBreakpointsParams = params;
            return {};
        });
        dap.on('enableCustomBreakpoints', async (params) => {
            for (const id of params.ids)
                this._customBreakpoints.add(id);
            return {};
        });
        dap.on('disableCustomBreakpoints', async (params) => {
            for (const id of params.ids)
                this._customBreakpoints.delete(id);
            return {};
        });
        dap.on('configurationDone', async () => {
            return {};
        });
        dap.on('threads', async () => {
            return { threads: [] };
        });
        dap.on('loadedSources', async () => {
            return { sources: [] };
        });
    }
    async configure(adapter) {
        if (this._setExceptionBreakpointsParams)
            await adapter.setExceptionBreakpoints(this._setExceptionBreakpointsParams);
        for (const { params, ids } of this._setBreakpointsParams)
            await adapter.breakpointManager.setBreakpoints(params, ids);
        await adapter.enableCustomBreakpoints({ ids: Array.from(this._customBreakpoints) });
        await adapter.configurationDone();
    }
}
function startDebugServer(port, host) {
    return new Promise((resolve, reject) => {
        const server = net
            .createServer(async (socket) => {
            const services = ioc_1.createTopLevelSessionContainer(ioc_1.createGlobalContainer({ storagePath, isVsCode: false }));
            const binderDelegate = {
                async acquireDap() {
                    // Note: we can make multi-session work through custom dap message:
                    // - spin up a separate server for this session;
                    // - ask ui part to create a session for us and connect to the port;
                    // - marshall target name changes across.
                    return connection;
                },
                async initAdapter(debugAdapter) {
                    await configurator.configure(debugAdapter);
                    return true;
                },
                releaseDap() {
                    // no-op
                },
            };
            const transport = new transport_1.StreamDapTransport(socket, socket, services.get(logging_1.ILogger));
            const connection = new connection_1.default(transport, services.get(logging_1.ILogger));
            new binder_1.Binder(binderDelegate, connection, services, new targetOrigin_1.TargetOrigin('targetOrigin'));
            const configurator = new Configurator(connection.dap());
        })
            .on('error', reject)
            .listen({ port, host }, () => {
            console.log(`Debug server listening at ${server.address().port}`);
            resolve({
                dispose: () => {
                    server.close();
                },
            });
        });
    });
}
exports.startDebugServer = startDebugServer;
//# sourceMappingURL=debugServer.js.map
//# sourceMappingURL=debugServer.js.map
