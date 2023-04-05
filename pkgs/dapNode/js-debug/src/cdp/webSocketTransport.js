"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
const ws_1 = __importDefault(require("ws"));
const cancellation_1 = require("../common/cancellation");
const events_1 = require("../common/events");
const hrnow_1 = require("../common/hrnow");
const urlUtils_1 = require("../common/urlUtils");
class WebSocketTransport {
    constructor(ws) {
        this.messageEmitter = new events_1.EventEmitter();
        this.endEmitter = new events_1.EventEmitter();
        this.onMessage = this.messageEmitter.event;
        this.onEnd = this.endEmitter.event;
        this._ws = ws;
        this._ws.addEventListener('message', event => {
            this.messageEmitter.fire([event.data, new hrnow_1.HrTime()]);
        });
        this._ws.addEventListener('close', () => {
            this.endEmitter.fire();
            this._ws = undefined;
        });
        this._ws.addEventListener('error', () => {
            // Silently ignore all errors - we don't know what to do with them.
        });
    }
    /**
     * Creates a WebSocket transport by connecting to the given URL.
     */
    static async create(url, cancellationToken) {
        const isSecure = !url.startsWith('ws://');
        const targetAddressIsLoopback = await urlUtils_1.isLoopback(url);
        const ws = new ws_1.default(url, [], {
            headers: { host: 'localhost' },
            perMessageDeflate: false,
            maxPayload: 256 * 1024 * 1024,
            rejectUnauthorized: !(isSecure && targetAddressIsLoopback),
            followRedirects: true,
        });
        return cancellation_1.timeoutPromise(new Promise((resolve, reject) => {
            ws.addEventListener('open', () => resolve(new WebSocketTransport(ws)));
            ws.addEventListener('error', errorEvent => reject(errorEvent.error)); // Parameter is an ErrorEvent. See https://github.com/websockets/ws/blob/master/doc/ws.md#websocketonerror
        }), cancellationToken, `Could not open ${url}`).catch(err => {
            ws.close();
            throw err;
        });
    }
    /**
     * @inheritdoc
     */
    send(message) {
        var _a;
        (_a = this._ws) === null || _a === void 0 ? void 0 : _a.send(message);
    }
    /**
     * @inheritdoc
     */
    dispose() {
        return new Promise(resolve => {
            if (!this._ws) {
                return resolve();
            }
            this._ws.addEventListener('close', resolve);
            this._ws.close();
        });
    }
}
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=webSocketTransport.js.map
//# sourceMappingURL=webSocketTransport.js.map
