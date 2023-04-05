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
const chai_1 = require("chai");
const connection_1 = __importStar(require("../cdp/connection"));
const nullTransport_1 = require("../cdp/nullTransport");
const webSocketTransport_1 = require("../cdp/webSocketTransport");
const cancellation_1 = require("../common/cancellation");
const logger_1 = require("../common/logging/logger");
const promiseUtil_1 = require("../common/promiseUtil");
const nullTelemetryReporter_1 = require("../telemetry/nullTelemetryReporter");
const cdpProxy_1 = require("./cdpProxy");
const portLeaseTracker_1 = require("./portLeaseTracker");
describe('CdpProxyProvider', () => {
    let transport;
    let provider;
    let clientConn;
    let client;
    beforeEach(async () => {
        transport = new nullTransport_1.NullTransport();
        const cdp = new connection_1.default(transport, logger_1.Logger.null, new nullTelemetryReporter_1.NullTelemetryReporter());
        provider = new cdpProxy_1.CdpProxyProvider(cdp.createSession('sesh'), new portLeaseTracker_1.PortLeaseTracker('local'), logger_1.Logger.null);
        const addr = await provider.proxy();
        clientConn = new connection_1.default(await webSocketTransport_1.WebSocketTransport.create(`ws://${addr.host}:${addr.port}${addr.path}`, cancellation_1.NeverCancelled), logger_1.Logger.null, new nullTelemetryReporter_1.NullTelemetryReporter());
        client = clientConn.rootSession();
    });
    afterEach(() => Promise.all([clientConn.close(), provider.dispose()]));
    it('round trips a request', async () => {
        transport.onDidSendEmitter.event(async (message) => {
            const cast = message;
            chai_1.expect(cast.id).to.be.a('number');
            chai_1.expect(cast.method).to.equal('Runtime.evaluate');
            chai_1.expect(cast.params).to.deep.equal({ expression: 'hello!' });
            await promiseUtil_1.delay(0);
            transport.injectMessage({
                id: cast.id,
                result: { ok: true },
                sessionId: message.sessionId,
            });
        });
        chai_1.expect(await client.Runtime.evaluate({ expression: 'hello!' })).to.deep.equal({ ok: true });
    });
    it('bubbles errors', async () => {
        transport.onDidSendEmitter.event(async (message) => {
            await promiseUtil_1.delay(0);
            transport.injectMessage({
                id: message.id,
                error: { code: 1234, message: 'something went wrong' },
                sessionId: message.sessionId,
            });
        });
        try {
            await client.session.sendOrDie('Runtime.evaluate', { expression: 'hello!' });
            throw new Error('expected to reject');
        }
        catch (e) {
            if (!(e instanceof connection_1.ProtocolError)) {
                throw e;
            }
            chai_1.expect(e.cause).to.deep.equal({ code: 1234, message: 'something went wrong' });
        }
    });
    it('deals with unknown method in JsDebug domain', async () => {
        try {
            await client.session.sendOrDie('JsDebug.constructor', {});
            throw new Error('expected to reject');
        }
        catch (e) {
            if (!(e instanceof connection_1.ProtocolError)) {
                throw e;
            }
            chai_1.expect(e.cause).to.deep.equal({ code: -32601, message: 'JsDebug.constructor not found' });
        }
    });
    it('subscribes', async () => {
        transport.onDidSendEmitter.event(async (message) => {
            await promiseUtil_1.delay(0);
            [
                'Runtime.consoleAPICalled',
                'Runtime.exceptionThrown',
                'Debugger.scriptParsed',
                'Animation.animationStarted',
            ].forEach(method => transport.injectMessage({ method, sessionId: message.sessionId, params: {} }));
            transport.injectMessage({
                id: message.id,
                result: { ok: true },
                sessionId: message.sessionId,
            });
        });
        const recv = [];
        client.Runtime.on('consoleAPICalled', () => recv.push('Runtime.consoleAPICalled'));
        client.Runtime.on('exceptionThrown', () => recv.push('Runtime.exceptionThrown'));
        client.Debugger.on('scriptParsed', () => recv.push('Debugger.scriptParsed'));
        client.Animation.on('animationStarted', () => recv.push('Animation.animationStarted'));
        await client.Runtime.evaluate({ expression: '' });
        chai_1.expect(recv).to.be.empty;
        await client.JsDebug.subscribe({
            events: ['Debugger.*', 'Runtime.consoleAPICalled'],
        });
        await client.session.sendOrDie('Runtime.evaluate', { expression: '' });
        chai_1.expect(recv).to.deep.equal(['Runtime.consoleAPICalled', 'Debugger.scriptParsed']);
    });
    describe('replays', () => {
        it('CSS', async () => {
            transport.onDidSendEmitter.event(async (message) => {
                await promiseUtil_1.delay(0);
                transport.injectMessage({
                    id: message.id,
                    result: {},
                    sessionId: message.sessionId,
                });
            });
            transport.injectMessage({
                method: 'CSS.styleSheetAdded',
                params: { styleSheetId: '42' },
                sessionId: 'sesh',
            });
            transport.injectMessage({
                method: 'CSS.styleSheetAdded',
                params: { styleSheetId: '43' },
                sessionId: 'sesh',
            });
            transport.injectMessage({
                method: 'CSS.styleSheetRemoved',
                params: { styleSheetId: '43' },
                sessionId: 'sesh',
            });
            const events = [];
            client.CSS.on('styleSheetAdded', evt => events.push(evt));
            client.CSS.on('styleSheetRemoved', evt => events.push(evt));
            chai_1.expect(await client.CSS.enable({})).to.deep.equal({});
            chai_1.expect(events).to.deep.equal([{ styleSheetId: '42' }]);
        });
    });
});
//# sourceMappingURL=cdpProxy.test.js.map
//# sourceMappingURL=cdpProxy.test.js.map
