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
exports.waitForServerToListen = exports.makeAcquireWebSocketServer = exports.makeAcquireTcpServer = exports.acquirePortNumber = exports.isPortOpen = exports.findOpenPort = void 0;
const net = __importStar(require("net"));
const WebSocket = __importStar(require("ws"));
const cancellation_1 = require("./cancellation");
const random_1 = require("./random");
async function findOpenPort({ min = 53000 /* Min */, max = 54000 /* Max */, attempts = 1000, tester = acquirePortNumber, } = {}, cancellationToken = cancellation_1.NeverCancelled) {
    let port = random_1.randomInRange(min, max);
    for (let i = Math.min(attempts, max - min);; i--) {
        try {
            return await tester(port, cancellationToken);
        }
        catch (e) {
            if (i === 0 || e instanceof cancellation_1.TaskCancelledError) {
                throw e;
            }
            else {
                port = port === max - 1 ? min : port + 1;
            }
        }
    }
}
exports.findOpenPort = findOpenPort;
/**
 * Checks whether the port is open.
 */
async function isPortOpen(port, ct) {
    try {
        await acquirePortNumber(port, ct);
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.isPortOpen = isPortOpen;
/**
 * Checks that the port is open, throwing an error if not.
 * @returns the port number
 */
function acquirePortNumber(port, ct = cancellation_1.NeverCancelled) {
    let disposable;
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(port, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => resolve(address.port));
        });
        server.on('error', reject);
        disposable = ct.onCancellationRequested(() => {
            server.close();
            reject(new cancellation_1.TaskCancelledError('Port open lookup cancelled'));
        });
    }).finally(() => disposable === null || disposable === void 0 ? void 0 : disposable.dispose());
}
exports.acquirePortNumber = acquirePortNumber;
/**
 * Tester that can be passed into findOpenPort to create a TCP server.
 * @returns the listening server
 */
exports.makeAcquireTcpServer = (onSocket) => (port, ct) => {
    const server = net.createServer(onSocket);
    server.listen(port, '127.0.0.1');
    return exports.waitForServerToListen(server, ct);
};
/**
 * Tester that can be passed into findOpenPort to create a WebSocket server.
 * @returns the listening server
 */
exports.makeAcquireWebSocketServer = (options) => (port, ct) => exports.waitForServerToListen(new WebSocket.Server(Object.assign(Object.assign({ host: '127.0.0.1' }, options), { port })), ct);
exports.waitForServerToListen = (server, ct) => {
    let disposable;
    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.on('listening', () => resolve(server));
        disposable = ct.onCancellationRequested(() => {
            server.close();
            reject(new cancellation_1.TaskCancelledError('Port open lookup cancelled'));
        });
    }).finally(() => disposable === null || disposable === void 0 ? void 0 : disposable.dispose());
};
//# sourceMappingURL=findOpenPort.js.map
//# sourceMappingURL=findOpenPort.js.map
