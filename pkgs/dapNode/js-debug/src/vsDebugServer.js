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
const fs = __importStar(require("fs"));
/**
 * This script launches vscode-js-debug in server mode for Visual Studio
 */
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
require("reflect-metadata");
const nls = __importStar(require("vscode-nls"));
const promiseUtil_1 = require("./common/promiseUtil");
const ioc_1 = require("./ioc");
const serverSessionManager_1 = require("./serverSessionManager");
const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-js-debug-'));
const localize = nls.loadMessageBundle();
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
class VsDebugServer {
    constructor(inputStream, outputStream) {
        const services = ioc_1.createGlobalContainer({ storagePath, isVsCode: false });
        this.sessionServer = new serverSessionManager_1.ServerSessionManager(services, this);
        const deferredConnection = promiseUtil_1.getDeferred();
        const rootSession = new VSDebugSession('root', localize('session.rootSessionName', 'JavaScript debug adapter'), deferredConnection.promise, { type: 'pwa-chrome', name: 'root', request: 'launch' });
        if (inputStream && outputStream) {
            this.launchRootFromExisting(deferredConnection, rootSession, inputStream, outputStream);
        }
        else {
            this.launchRoot(deferredConnection, rootSession);
        }
    }
    launchRootFromExisting(deferredConnection, session, inputStream, outputStream) {
        const newSession = this.sessionServer.createRootDebugSessionFromStreams(session, inputStream, outputStream);
        deferredConnection.resolve(newSession.connection);
    }
    async launchRoot(deferredConnection, session) {
        const result = await this.sessionServer.createRootDebugServer(session, debugServerPort);
        result.connectionPromise.then(x => deferredConnection.resolve(x));
        console.log(result.server.address().port.toString());
    }
    launch(parentSession, target, config) {
        const childAttachConfig = Object.assign(Object.assign({}, config), { sessionId: target.id, __jsDebugChildServer: '' });
        const deferredConnection = promiseUtil_1.getDeferred();
        const session = new VSDebugSession(target.id(), target.name(), deferredConnection.promise, childAttachConfig);
        this.sessionServer.createChildDebugServer(session).then(({ server, connectionPromise }) => {
            connectionPromise.then(x => deferredConnection.resolve(x));
            childAttachConfig.__jsDebugChildServer = server.address().port.toString();
            // Custom message currently not part of DAP
            parentSession.connection._send({
                seq: 0,
                command: 'attachedChildSession',
                type: 'request',
                arguments: {
                    config: childAttachConfig,
                },
            });
        });
    }
}
const debugServerPort = process.argv.length >= 3 ? +process.argv[2] : undefined;
if (debugServerPort !== undefined) {
    const server = net
        .createServer(socket => {
        new VsDebugServer(socket, socket);
    })
        .listen(debugServerPort);
    console.log(`Listening at ${server.address().port}`);
}
else {
    new VsDebugServer();
}
//# sourceMappingURL=vsDebugServer.js.map
//# sourceMappingURL=vsDebugServer.js.map
