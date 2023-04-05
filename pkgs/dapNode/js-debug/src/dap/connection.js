"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRootDapApi = exports.IDapApi = exports.isRequest = void 0;
const promiseUtil_1 = require("../common/promiseUtil");
const errors_1 = require("./errors");
const logOmittedCalls_1 = require("./logOmittedCalls");
const protocolError_1 = require("./protocolError");
const requestSuffix = 'Request';
exports.isRequest = (req) => req.endsWith('Request');
/**
 * Symbol injected to get the closest DAP connection.
 */
exports.IDapApi = Symbol('IDapApi');
/**
 * Symbol to get the DAP connection for the top-level logical session.
 */
exports.IRootDapApi = Symbol('IRootDapApi');
class Connection {
    constructor(transport, logger) {
        this.transport = transport;
        this.logger = logger;
        this._pendingRequests = new Map();
        this._requestHandlers = new Map();
        this._eventListeners = new Map();
        this.disposables = [];
        this._initialized = promiseUtil_1.getDeferred();
        this.closed = false;
        this._sequence = 1;
        this.disposables.push(this.transport.messageReceived(event => this._onMessage(event.message, event.receivedTime)));
        this._dap = Promise.resolve(this._createApi());
    }
    /**
     * Get a promise which will resolve with this connection after the session has responded to initialize
     */
    get initializedBlocker() {
        return this._initialized.promise;
    }
    attachTelemetry(telemetryReporter) {
        this.telemetryReporter = telemetryReporter;
        this._dap.then(dap => telemetryReporter.attachDap(dap));
    }
    dap() {
        return this._dap;
    }
    _createApi() {
        return new Proxy({}, {
            get: (_target, methodName) => {
                if (methodName === 'then')
                    return;
                if (methodName === 'on') {
                    return (requestName, handler) => {
                        this._requestHandlers.set(requestName, handler);
                        return () => this._requestHandlers.delete(requestName);
                    };
                }
                if (methodName === 'off')
                    return (requestName) => this._requestHandlers.delete(requestName);
                return (params) => {
                    if (exports.isRequest(methodName)) {
                        return this.enqueueRequest(methodName.slice(0, -requestSuffix.length), params);
                    }
                    this._send({ seq: 0, type: 'event', event: methodName, body: params });
                };
            },
        });
    }
    createTestApi() {
        const on = (eventName, listener) => {
            let listeners = this._eventListeners.get(eventName);
            if (!listeners) {
                listeners = new Set();
                this._eventListeners.set(eventName, listeners);
            }
            listeners.add(listener);
        };
        const off = (eventName, listener) => {
            const listeners = this._eventListeners.get(eventName);
            if (listeners)
                listeners.delete(listener);
        };
        const once = (eventName, filter) => {
            return new Promise(cb => {
                const listener = (params) => {
                    if (filter && !filter(params))
                        return;
                    off(eventName, listener);
                    cb(params);
                };
                on(eventName, listener);
            });
        };
        return new Proxy({}, {
            get: (_target, methodName) => {
                if (methodName === 'on')
                    return on;
                if (methodName === 'off')
                    return off;
                if (methodName === 'once')
                    return once;
                return (params) => this.enqueueRequest(methodName, params);
            },
        });
    }
    enqueueRequest(command, params) {
        return new Promise(cb => {
            const request = { seq: 0, type: 'request', command, arguments: params || {} };
            this._send(request); // this updates request.seq
            this._pendingRequests.set(request.seq, cb);
        });
    }
    stop() {
        this.closed = true;
        this.transport.close();
    }
    _send(message) {
        if (!this.closed) {
            message.seq = this._sequence++;
            const shouldLog = message.type !== 'event' || !logOmittedCalls_1.logOmittedCalls.has(message.body);
            this.transport.send(message, shouldLog);
        }
        else {
            this.logger.warn("dap.send" /* DapSend */, `Not sending message because the connection has ended`, message);
        }
    }
    async _onMessage(msg, receivedTime) {
        var _a, _b, _c, _d;
        if (msg.type === 'request') {
            const response = {
                seq: 0,
                type: 'response',
                // eslint-disable-next-line @typescript-eslint/camelcase
                request_seq: msg.seq,
                command: msg.command,
                success: true,
            };
            try {
                const callback = this._requestHandlers.get(msg.command);
                if (!callback) {
                    console.error(`Unknown request: ${msg.command}`);
                }
                else {
                    const result = await callback(msg.arguments);
                    if (errors_1.isDapError(result)) {
                        this._send(Object.assign(Object.assign({}, response), { success: false, message: result.error.format, body: { error: result.error } }));
                    }
                    else {
                        this._send(Object.assign(Object.assign({}, response), { body: result }));
                        if (response.command === 'initialize') {
                            this._initialized.resolve(this);
                        }
                        else if (response.command === 'disconnect') {
                            // close the DAP connection after we respond to disconnect so that
                            // no more messages are allowed to go through.
                            process.nextTick(() => {
                                this.stop();
                            });
                        }
                    }
                }
                (_a = this.telemetryReporter) === null || _a === void 0 ? void 0 : _a.reportOperation('dapOperation', msg.command, receivedTime.elapsed().ms);
            }
            catch (e) {
                if (e instanceof protocolError_1.ProtocolError) {
                    this._send(Object.assign(Object.assign({}, response), { success: false, body: { error: e.cause } }));
                }
                else {
                    console.error(e);
                    this._send(Object.assign(Object.assign({}, response), { success: false, body: {
                            error: {
                                id: 9221,
                                format: `Error processing ${msg.command}: ${e.stack || e.message}`,
                                showUser: false,
                                sendTelemetry: false,
                            },
                        } }));
                }
                (_b = this.telemetryReporter) === null || _b === void 0 ? void 0 : _b.reportOperation('dapOperation', msg.command, receivedTime.elapsed().ms, e);
            }
        }
        if (msg.type === 'event') {
            const listeners = this._eventListeners.get(msg.event) || new Set();
            for (const listener of listeners)
                listener(msg.body);
        }
        if (msg.type === 'response') {
            const cb = this._pendingRequests.get(msg.request_seq);
            if (!this.logger.assert(cb, `Expected callback for request sequence ID ${msg.request_seq}`)) {
                return;
            }
            this._pendingRequests.delete(msg.request_seq);
            if (msg.success) {
                cb(msg.body);
            }
            else {
                // eslint-disable-next-line
                const format = (_d = (_c = msg.body) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.format;
                cb(format || msg.message || `Unknown error`);
            }
        }
    }
}
exports.default = Connection;
//# sourceMappingURL=connection.js.map
//# sourceMappingURL=connection.js.map
