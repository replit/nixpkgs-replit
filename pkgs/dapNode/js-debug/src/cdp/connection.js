"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPSession = exports.ProtocolError = exports.ICdpApi = void 0;
const events_1 = require("../common/events");
let connectionId = 0;
exports.ICdpApi = Symbol('ICdpApi');
class ProtocolError extends Error {
    constructor(method) {
        super('<<message>>');
        this.method = method;
    }
    setCause(code, message) {
        var _a;
        this.cause = { code, message };
        this.message = `CDP error ${code} calling method ${this.method}: ${message}`;
        this.stack = (_a = this.stack) === null || _a === void 0 ? void 0 : _a.replace('<<message>>', this.message);
        return this;
    }
}
exports.ProtocolError = ProtocolError;
class Connection {
    constructor(transport, logger, telemetryReporter) {
        this.logger = logger;
        this.telemetryReporter = telemetryReporter;
        this._connectionId = connectionId++;
        this._lastId = 1000;
        this._disposedSessions = new Map();
        this._onDisconnectedEmitter = new events_1.EventEmitter();
        this.waitWrapper = makeWaitForNextTask();
        this.onDisconnected = this._onDisconnectedEmitter.event;
        this._transport = transport;
        this._transport.onMessage(([message, time]) => this._onMessage(message, time));
        this._transport.onEnd(() => this._onTransportClose());
        this._sessions = new Map();
        this._closed = false;
        this._rootSession = new CDPSession(this, '', this.logger);
        this._sessions.set('', this._rootSession);
    }
    rootSession() {
        return this._rootSession.cdp();
    }
    _send(method, params = {}, sessionId) {
        const id = ++this._lastId;
        const message = { id, method, params };
        if (sessionId)
            message.sessionId = sessionId;
        const messageString = JSON.stringify(message);
        this.logger.verbose("cdp.send" /* CdpSend */, undefined, { connectionId: this._connectionId, message });
        this._transport.send(messageString);
        return id;
    }
    _onMessage(message, receivedTime) {
        const object = JSON.parse(message);
        let objectToLog = object;
        // Don't print source code of getScriptSource responses
        if (object.result && object.result.scriptSource) {
            objectToLog = Object.assign(Object.assign({}, object), { result: Object.assign(Object.assign({}, object.result), { scriptSource: '<script source>' }) });
        }
        else if (object.method === 'Debugger.scriptParsed' &&
            object.params &&
            object.params.sourceMapURL &&
            object.params.sourceMapURL.startsWith('data:')) {
            objectToLog = Object.assign(Object.assign({}, object), { params: Object.assign(Object.assign({}, object.params), { sourceMapURL: '<data source map url>' }) });
        }
        this.logger.verbose("cdp.receive" /* CdpReceive */, undefined, {
            connectionId: this._connectionId,
            message: objectToLog,
        });
        const session = this._sessions.get(object.sessionId || '');
        if (!session) {
            const disposedDate = this._disposedSessions.get(object.sessionId);
            if (!disposedDate) {
                throw new Error(`Unknown session id: ${object.sessionId} while processing: ${object.method}`);
            }
            else {
                const secondsAgo = (Date.now() - disposedDate.getTime()) / 1000.0;
                this.logger.warn("internal" /* Internal */, `Got message for a session disposed ${secondsAgo} seconds ago`, { sessionId: object.sessionId, disposeOn: disposedDate });
                return; // We just ignore messages for disposed sessions
            }
        }
        const eventName = object.method;
        let error;
        try {
            session._onMessage(object);
        }
        catch (e) {
            error = e;
        }
        // if eventName is undefined is because this is a response to a cdp request, so we don't report it
        if (eventName) {
            this.telemetryReporter.reportOperation('cdpOperation', eventName, receivedTime.elapsed().ms, error);
        }
    }
    _onTransportClose() {
        if (this._closed)
            return;
        this._closed = true;
        this._transport.dispose();
        for (const session of this._sessions.values())
            session._onClose();
        this._sessions.clear();
        this._onDisconnectedEmitter.fire();
    }
    close() {
        this._onTransportClose();
    }
    isClosed() {
        return this._closed;
    }
    createSession(sessionId) {
        const session = new CDPSession(this, sessionId, this.logger);
        this._sessions.set(sessionId, session);
        return session.cdp();
    }
    disposeSession(sessionId) {
        const session = this._sessions.get(sessionId);
        if (!session)
            return;
        session._onClose();
        this._disposedSessions.set(session.sessionId(), new Date());
        this._sessions.delete(session.sessionId());
    }
}
exports.default = Connection;
// Node versions before 11.0.0 do not guarantee relative order of tasks and microstasks.
// We artificially queue protocol messages to achieve this.
const needsReordering = +process.version.substring(1).split('.')[0] < 11;
class CDPSession {
    constructor(connection, sessionId, logger) {
        this.logger = logger;
        this._queue = [];
        this._prefixListeners = new events_1.ListenerMap();
        this._directListeners = new events_1.ListenerMap();
        this.paused = false;
        this._callbacks = new Map();
        this._connection = connection;
        this._sessionId = sessionId;
        this._cdp = this._createApi();
    }
    pause() {
        this.paused = true;
    }
    resume() {
        if (!this.paused) {
            return;
        }
        this.paused = false;
        const toSend = this._queue;
        this._queue = [];
        this.logger.verbose("cdp.receive" /* CdpReceive */, 'Dequeue messages', { message: toSend });
        for (const item of toSend) {
            this._processResponse(item);
        }
    }
    cdp() {
        return this._cdp;
    }
    sessionId() {
        return this._sessionId;
    }
    _createApi() {
        return new Proxy({}, {
            get: (_target, agentName) => {
                if (agentName === 'pause')
                    return () => this.pause();
                if (agentName === 'resume')
                    return () => this.resume();
                if (agentName === 'session')
                    return this;
                return new Proxy({}, {
                    get: (_target, methodName) => {
                        if (methodName === 'then')
                            return;
                        if (methodName === 'on')
                            return (eventName, listener) => this.on(`${agentName}.${eventName}`, listener);
                        return (params) => this.send(`${agentName}.${methodName}`, params);
                    },
                });
            },
        });
    }
    /**
     * Adds a new listener for the given method.
     */
    on(method, listener) {
        return this._directListeners.listen(method, listener);
    }
    /**
     * Adds a new listener for the given prefix.
     */
    onPrefix(method, listener) {
        return this._prefixListeners.listen(method, listener);
    }
    /**
     * Sends a request to CDP, returning its untyped result.
     */
    send(method, params = {}) {
        return this.sendOrDie(method, params).catch(() => undefined);
    }
    /**
     * Sends a request to CDP, returning a standard Promise
     * with its resulting state.
     */
    sendOrDie(method, params = {}) {
        if (!this._connection) {
            return Promise.reject(new ProtocolError(method).setCause(0, 'Connection is closed'));
        }
        const id = this._connection._send(method, params, this._sessionId);
        return new Promise((resolve, reject) => {
            this._callbacks.set(id, {
                resolve,
                reject,
                from: new ProtocolError(method),
                method,
            });
        });
    }
    /**
     * Handles an incoming message. Called by the connection.
     */
    _onMessage(object) {
        // If we're paused, queue events but still process responses to avoid hanging.
        if (this.paused && object.id) {
            this._processResponse(object);
            return;
        }
        // either replaying a paused queue, or needs reordering, if there's a queue
        if (this._queue.length > 0) {
            this._queue.push(object);
            return;
        }
        // otherwise, if we don't need reordering and aren't paused, process it now
        if (!needsReordering && !this.paused) {
            this._processResponse(object);
            return;
        }
        // we know now that we have no existing queue but need to queue an item. Do so.
        this._queue.push(object);
        if (!this.paused) {
            this._processQueue();
        }
    }
    _processQueue() {
        var _a;
        (_a = this._connection) === null || _a === void 0 ? void 0 : _a.waitWrapper(() => {
            if (this.paused) {
                return;
            }
            const object = this._queue.shift();
            if (!object) {
                return;
            }
            this._processResponse(object);
            if (this._queue.length) {
                this._processQueue();
            }
        });
    }
    _processResponse(object) {
        if (object.id === undefined) {
            // for some reason, TS doesn't narrow this even though CdpProtocol.ICommand
            // is the only type of the tuple where id can be undefined.
            const asCommand = object;
            this._directListeners.emit(asCommand.method, asCommand.params);
            // May eventually be useful to use a trie here if
            // this becomes hot with many listeners
            for (const [key, emitter] of this._prefixListeners.listeners) {
                if (asCommand.method.startsWith(key)) {
                    emitter.fire(asCommand);
                }
            }
            return;
        }
        const callback = this._callbacks.get(object.id);
        if (!callback) {
            return;
        }
        this._callbacks.delete(object.id);
        if ('error' in object) {
            callback.reject(callback.from.setCause(object.error.code, object.error.message));
        }
        else if ('result' in object) {
            callback.resolve(object.result);
        }
    }
    async detach() {
        if (!this._connection) {
            throw new Error(`Session already detached. Most likely the target has been closed.`);
        }
        this._connection._send('Target.detachFromTarget', {}, this._sessionId);
    }
    isClosed() {
        return !this._connection;
    }
    /**
     * Marks the session as closed, called by the connection.
     */
    _onClose() {
        for (const callback of this._callbacks.values()) {
            callback.reject(callback.from.setCause(0, 'Connection is closed'));
        }
        this._callbacks.clear();
        this._connection = undefined;
    }
}
exports.CDPSession = CDPSession;
// implementation taken from playwright: https://github.com/microsoft/playwright/blob/59d0f8728d4809b39785d68d7a146f06f0dbe2e6/src/helper.ts#L233
// See https://joel.tools/microtasks/
function makeWaitForNextTask() {
    if (parseInt(process.versions.node, 10) >= 11)
        return setImmediate;
    // Unlike Node 11, Node 10 and less have a bug with Task and MicroTask execution order:
    // - https://github.com/nodejs/node/issues/22257
    //
    // So we can't simply run setImmediate to dispatch code in a following task.
    // However, we can run setImmediate from-inside setImmediate to make sure we're getting
    // in the following task.
    let spinning = false;
    const callbacks = [];
    const loop = () => {
        const callback = callbacks.shift();
        if (!callback) {
            spinning = false;
            return;
        }
        setImmediate(loop);
        // Make sure to call callback() as the last thing since it's
        // untrusted code that might throw.
        callback();
    };
    return (callback) => {
        callbacks.push(callback);
        if (!spinning) {
            spinning = true;
            setImmediate(loop);
        }
    };
}
//# sourceMappingURL=connection.js.map
//# sourceMappingURL=connection.js.map
