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
require('source-map-support').install(); // Enable TypeScript stack traces translation
require("reflect-metadata");
/**
 * This script launches the pwa adapter in "flat session" mode for DAP, which means
 * that all DAP traffic will be routed through a single connection (either tcp socket or stdin/out)
 * and use the sessionId field on each message to route it to the correct child session
 */
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const ioc_1 = require("./ioc");
const sessionManager_1 = require("./sessionManager");
const promiseUtil_1 = require("./common/promiseUtil");
const transport_1 = require("./dap/transport");
const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-js-debug-'));
class VSDebugSession {
    constructor(id, name, childConnection, configuration) {
        this.id = id;
        this.childConnection = childConnection;
        this.configuration = configuration;
        this._name = name;
    }
    set name(newName) {
        this._name = newName;
        this.childConnection
            .then(conn => conn.initializedBlocker)
            .then(conn => conn.dap())
            .then(dap => {
            dap.process({ name: newName });
        });
    }
    get name() {
        return this._name;
    }
}
class VSSessionManager {
    constructor(inputStream, outputStream) {
        this.services = ioc_1.createGlobalContainer({ storagePath, isVsCode: false });
        this.sessionManager = new sessionManager_1.SessionManager(this.services, this.buildVSSessionLauncher());
        this.rootTransport = new transport_1.StreamDapTransport(inputStream, outputStream);
        this.createSession(undefined, 'rootSession', {
            type: "pwa-chrome" /* Chrome */,
            name: 'javascript debugger root session',
            request: 'launch',
            __pendingTargetId: '',
        });
    }
    buildVSSessionLauncher() {
        return {
            launch: (parentSession, target, config) => {
                const childAttachConfig = Object.assign(Object.assign({}, config), { sessionId: target.id() });
                this.createSession(target.id(), target.name(), childAttachConfig);
                // Custom message currently not part of DAP
                parentSession.connection._send({
                    seq: 0,
                    command: 'attachedChildSession',
                    type: 'request',
                    arguments: {
                        config: childAttachConfig,
                    },
                });
            },
        };
    }
    createSession(sessionId, name, config) {
        const deferredConnection = promiseUtil_1.getDeferred();
        const vsSession = new VSDebugSession(sessionId || 'root', name, deferredConnection.promise, config);
        const transport = new transport_1.SessionIdDapTransport(sessionId, this.rootTransport);
        const newSession = config.__pendingTargetId
            ? this.sessionManager.createNewChildSession(vsSession, config.__pendingTargetId, transport)
            : this.sessionManager.createNewRootSession(vsSession, transport);
        deferredConnection.resolve(newSession.connection);
        return newSession;
    }
}
const debugServerPort = process.argv.length >= 3 ? +process.argv[2] : undefined;
if (debugServerPort !== undefined) {
    const server = net
        .createServer(async (socket) => {
        new VSSessionManager(socket, socket);
    })
        .listen(debugServerPort);
    console.log(`Listening at ${server.address().port}`);
}
else {
    new VSSessionManager(process.stdin, process.stdout);
}
//# sourceMappingURL=flatSessionLauncher.js.map
//# sourceMappingURL=flatSessionLauncher.js.map
