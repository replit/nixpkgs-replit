"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerSessionManager = void 0;
const portLeaseTracker_1 = require("./adapter/portLeaseTracker");
const promiseUtil_1 = require("./common/promiseUtil");
const transport_1 = require("./dap/transport");
const sessionManager_1 = require("./sessionManager");
/**
 * A class for handling specifically server-based sessions in js-debug
 */
class ServerSessionManager {
    constructor(globalContainer, sessionLauncher) {
        this.disposables = [];
        this.servers = new Map();
        this.sessionManager = new sessionManager_1.SessionManager(globalContainer, sessionLauncher);
        this.portLeaseTracker = globalContainer.get(portLeaseTracker_1.IPortLeaseTracker);
        this.disposables.push(this.sessionManager);
    }
    /**
     * Create the appropriate debug server type from the configuration passed in the debug session
     * @param debugSession The IDE-specific debug session
     * @param debugServerPort Optional debug port to specify the listening port for the server
     */
    createDebugServer(debugSession, debugServerPort) {
        if (debugSession.configuration.__pendingTargetId) {
            return this.createChildDebugServer(debugSession);
        }
        else {
            return this.createRootDebugServer(debugSession, debugServerPort);
        }
    }
    /**
     * Create a new debug server for a new root session
     * @param debugSession The IDE-specific debug session
     * @returns The newly created debug server and a promise which resolves to the DapConnection associated with the session
     */
    createRootDebugServer(debugSession, debugServerPort) {
        return this.innerCreateServer(debugSession, transport => this.sessionManager.createNewRootSession(debugSession, transport), debugServerPort);
    }
    /**
     * Create a new root debug session using an existing set of streams
     * @param debugSession The IDE-specific debug session
     * @param inputStream The DAP input stream
     * @param outputStream The DAP output stream
     */
    createRootDebugSessionFromStreams(debugSession, inputStream, outputStream) {
        const transport = new transport_1.StreamDapTransport(inputStream, outputStream);
        return this.sessionManager.createNewRootSession(debugSession, transport);
    }
    /**
     * Create a new debug server for a new child session
     * @param debugSession The IDE-specific debug session
     * @returns The newly created debug server and a promise which resolves to the DapConnection associated with the session
     */
    createChildDebugServer(debugSession) {
        return this.innerCreateServer(debugSession, transport => this.sessionManager.createNewChildSession(debugSession, debugSession.configuration.__pendingTargetId, transport));
    }
    async innerCreateServer(debugSession, sessionCreationFunc, port) {
        const deferredConnection = promiseUtil_1.getDeferred();
        const debugServer = await portLeaseTracker_1.acquireTrackedServer(this.portLeaseTracker, socket => {
            const transport = new transport_1.StreamDapTransport(socket, socket);
            const session = sessionCreationFunc(transport);
            deferredConnection.resolve(session.connection);
        }, port);
        this.servers.set(debugSession.id, debugServer);
        return { server: debugServer, connectionPromise: deferredConnection.promise };
    }
    /**
     * @inheritdoc
     */
    terminate(debugSession) {
        var _a;
        this.sessionManager.terminate(debugSession);
        (_a = this.servers.get(debugSession.id)) === null || _a === void 0 ? void 0 : _a.close();
        this.servers.delete(debugSession.id);
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.sessionManager.dispose();
    }
}
exports.ServerSessionManager = ServerSessionManager;
//# sourceMappingURL=serverSessionManager.js.map
//# sourceMappingURL=serverSessionManager.js.map
