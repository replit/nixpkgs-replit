"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionIdDapTransport = exports.StreamDapTransport = void 0;
const events_1 = require("../common/events");
const hrnow_1 = require("../common/hrnow");
const _TWO_CRLF = '\r\n\r\n';
let connectionId = 0;
class StreamDapTransport {
    constructor(inputStream, outputStream, logger) {
        this.inputStream = inputStream;
        this.outputStream = outputStream;
        this._contentLength = -1;
        this._connectionId = connectionId++;
        this.msgEmitter = new events_1.EventEmitter();
        this.messageReceived = this.msgEmitter.event;
        this.endedEmitter = new events_1.EventEmitter();
        this.closed = this.endedEmitter.event;
        this._handleData = (data) => {
            var _a;
            const receivedTime = new hrnow_1.HrTime();
            this._rawData = Buffer.concat([this._rawData, data]);
            while (true) {
                if (this._contentLength >= 0) {
                    if (this._rawData.length >= this._contentLength) {
                        const message = this._rawData.toString('utf8', 0, this._contentLength);
                        this._rawData = this._rawData.slice(this._contentLength);
                        this._contentLength = -1;
                        if (message.length > 0) {
                            try {
                                const msg = JSON.parse(message);
                                (_a = this.logger) === null || _a === void 0 ? void 0 : _a.verbose("dap.receive" /* DapReceive */, undefined, {
                                    connectionId: this._connectionId,
                                    message: msg,
                                });
                                this.msgEmitter.fire({ message: msg, receivedTime });
                            }
                            catch (e) {
                                console.error('Error handling data: ' + (e && e.message));
                            }
                        }
                        continue; // there may be more complete messages to process
                    }
                }
                else {
                    const idx = this._rawData.indexOf(_TWO_CRLF);
                    if (idx !== -1) {
                        const header = this._rawData.toString('utf8', 0, idx);
                        const lines = header.split('\r\n');
                        for (let i = 0; i < lines.length; i++) {
                            const pair = lines[i].split(/: +/);
                            if (pair[0] === 'Content-Length') {
                                this._contentLength = +pair[1];
                            }
                        }
                        this._rawData = this._rawData.slice(idx + _TWO_CRLF.length);
                        continue;
                    }
                }
                break;
            }
        };
        this.logger = logger;
        this._rawData = Buffer.alloc(0);
        inputStream.on('end', () => this.endedEmitter.fire());
        inputStream.on('data', this._handleData);
    }
    send(message, shouldLog = true) {
        var _a, _b;
        const json = JSON.stringify(message);
        if (shouldLog) {
            let objectToLog = message;
            // Don't log the content for source responses
            if (message.type === 'response' && message.command === 'source') {
                objectToLog = Object.assign(Object.assign({}, message), { body: Object.assign(Object.assign({}, message.body), { content: '<script source>' }) });
            }
            (_a = this.logger) === null || _a === void 0 ? void 0 : _a.verbose("dap.send" /* DapSend */, undefined, {
                connectionId: this._connectionId,
                message: objectToLog,
            });
        }
        const data = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
        if (this.outputStream.destroyed) {
            (_b = this.logger) === null || _b === void 0 ? void 0 : _b.warn("dap.send" /* DapSend */, 'Message not sent. Connection was closed.');
            return;
        }
        this.outputStream.write(data, 'utf8', err => {
            var _a;
            if (err) {
                (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error("dap.send" /* DapSend */, 'Error while writing to output stream', err);
                this.close();
            }
        });
    }
    close() {
        this.inputStream.destroy();
        this.outputStream.destroy();
    }
    setLogger(logger) {
        this.logger = logger;
        return this;
    }
}
exports.StreamDapTransport = StreamDapTransport;
/**
 * Wraps another transport and adds session ids to messages being sent,
 * and only emits messages with this transport's session id
 */
class SessionIdDapTransport {
    constructor(sessionId, rootTransport) {
        this.sessionId = sessionId;
        this.rootTransport = rootTransport;
        this.sessionIdMessageEmitter = new events_1.EventEmitter();
        this.messageReceived = this.sessionIdMessageEmitter.event;
        this.closedEmitter = new events_1.EventEmitter();
        this.closed = this.closedEmitter.event;
        this._isClosed = false;
        this.disposables = [];
        this.disposables.push(rootTransport.messageReceived(e => this.onMessage(e)));
        this.disposables.push(rootTransport.closed(() => this.close()));
    }
    send(msg, shouldLog) {
        if (!this._isClosed) {
            msg.sessionId = this.sessionId;
            this.rootTransport.send(msg, shouldLog);
        }
    }
    setLogger(logger) {
        this.rootTransport.setLogger(logger);
        return this;
    }
    onMessage(event) {
        if (!this._isClosed && event.message.sessionId === this.sessionId) {
            this.sessionIdMessageEmitter.fire(event);
        }
    }
    close() {
        // don't actually close the root transport here, we just "disconnect" from it
        this._isClosed = true;
        this.disposables.forEach(x => x.dispose());
        this.closedEmitter.fire();
    }
}
exports.SessionIdDapTransport = SessionIdDapTransport;
//# sourceMappingURL=transport.js.map
//# sourceMappingURL=transport.js.map
