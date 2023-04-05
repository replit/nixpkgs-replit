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
exports.PortLeaseTracker = exports.IPortLeaseTracker = exports.acquireTrackedWebSocketServer = exports.acquireTrackedServer = void 0;
const inversify_1 = require("inversify");
const net = __importStar(require("net"));
const cancellation_1 = require("../common/cancellation");
const events_1 = require("../common/events");
const findOpenPort_1 = require("../common/findOpenPort");
const promiseUtil_1 = require("../common/promiseUtil");
const ioc_extras_1 = require("../ioc-extras");
/**
 * Helper that creates a server registered with the lease tracker.
 */
exports.acquireTrackedServer = async (tracker, onSocket, overridePort, ct = cancellation_1.NeverCancelled) => {
    const server = overridePort
        ? await findOpenPort_1.waitForServerToListen(net.createServer(onSocket).listen(overridePort, '127.0.0.1'), ct)
        : await findOpenPort_1.findOpenPort({ tester: findOpenPort_1.makeAcquireTcpServer(onSocket) }, ct);
    const dispose = tracker.register(server.address().port);
    server.on('close', () => dispose.dispose());
    server.on('error', () => dispose.dispose());
    return server;
};
/**
 * Helper that creates a server registered with the lease tracker.
 */
exports.acquireTrackedWebSocketServer = async (tracker, options, ct) => {
    const server = await findOpenPort_1.findOpenPort({ tester: findOpenPort_1.makeAcquireWebSocketServer(options) }, ct);
    const dispose = tracker.register(server.address().port);
    server.on('close', () => dispose.dispose());
    server.on('error', () => dispose.dispose());
    return server;
};
exports.IPortLeaseTracker = Symbol('IPortLeaseTracker');
let PortLeaseTracker = class PortLeaseTracker {
    constructor(location) {
        this.usedPorts = new Set();
        this.onRegistered = new events_1.EventEmitter();
        this.isMandated = location === 'remote';
    }
    /**
     * @inheritdoc
     */
    register(port) {
        this.usedPorts.add(port);
        this.onRegistered.fire(port);
        return { dispose: () => this.usedPorts.delete(port) };
    }
    /**
     * @inheritdoc
     */
    isRegistered(port, wait = 2000) {
        if (this.usedPorts.has(port)) {
            return Promise.resolve(true);
        }
        // don't wait if this port isn't in our default range
        if (port < 53000 /* Min */ || port >= 54000 /* Max */) {
            return Promise.resolve(false);
        }
        return cancellation_1.cancellableRace([
            () => promiseUtil_1.delay(wait).then(() => false),
            ct => new Promise(resolve => {
                const l = this.onRegistered.event(p => {
                    if (p === port) {
                        resolve(true);
                    }
                });
                ct.onCancellationRequested(() => l.dispose());
            }),
        ]);
    }
};
PortLeaseTracker = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.ExtensionLocation))
], PortLeaseTracker);
exports.PortLeaseTracker = PortLeaseTracker;
//# sourceMappingURL=portLeaseTracker.js.map
//# sourceMappingURL=portLeaseTracker.js.map
