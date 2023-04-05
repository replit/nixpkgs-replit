"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const rawPipeTransport_1 = require("../../cdp/rawPipeTransport");
const stream_1 = require("stream");
const logger_1 = require("../../common/logging/logger");
const crypto_1 = require("crypto");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const ws_1 = require("ws");
const webSocketTransport_1 = require("../../cdp/webSocketTransport");
const cancellation_1 = require("../../common/cancellation");
const gzipPipeTransport_1 = require("../../cdp/gzipPipeTransport");
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('cdp transport', () => {
    // cases where we create two transform streams linked to each other so that
    // messages written to one are read by the other.
    const cases = [
        [
            'raw pipe',
            async () => {
                const aIn = new stream_1.PassThrough();
                const bIn = new stream_1.PassThrough();
                const a = new rawPipeTransport_1.RawPipeTransport(logger_1.Logger.null, aIn, bIn);
                const b = new rawPipeTransport_1.RawPipeTransport(logger_1.Logger.null, bIn, aIn);
                return { a, b, dispose: () => undefined };
            },
        ],
        [
            'gzip',
            async () => {
                const aIn = new stream_1.PassThrough();
                const bIn = new stream_1.PassThrough();
                const a = new gzipPipeTransport_1.GzipPipeTransport(logger_1.Logger.null, aIn, bIn);
                const b = new gzipPipeTransport_1.GzipPipeTransport(logger_1.Logger.null, bIn, aIn);
                return { a, b, dispose: () => undefined };
            },
        ],
        [
            'websocket',
            async () => {
                const server = new ws_1.Server({ host: '127.0.0.1', port: 0 });
                await new Promise((resolve, reject) => {
                    server.on('listening', resolve);
                    server.on('error', reject);
                });
                const address = server.address();
                const a = webSocketTransport_1.WebSocketTransport.create(`ws://127.0.0.1:${address.port}`, cancellation_1.NeverCancelled);
                const b = new Promise((resolve, reject) => {
                    server.on('connection', cnx => resolve(new webSocketTransport_1.WebSocketTransport(cnx)));
                    server.on('error', reject);
                });
                return { a: await a, b: await b, dispose: () => server.close() };
            },
        ],
    ];
    for (const [name, factory] of cases) {
        describe(name, () => {
            it('round-trips', async () => {
                const rawData = crypto_1.randomBytes(100);
                const { a, b, dispose } = await factory();
                const actual = [];
                const expected = [];
                b.onMessage(([msg]) => actual.push(msg));
                for (let i = 0; i < rawData.length;) {
                    const consume = Math.floor(Math.random() * 20);
                    const str = rawData.slice(i, i + consume).toString('base64');
                    expected.push(str);
                    a.send(str);
                    i += consume;
                }
                await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(actual).to.deep.equal(expected));
                await a.dispose();
                dispose();
            });
            it('bubbles closure', async () => {
                const { a, b, dispose } = await factory();
                const aClose = sinon_1.stub();
                const bClose = sinon_1.stub();
                a.onEnd(aClose);
                b.onEnd(bClose);
                await a.dispose();
                await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(aClose.called).to.be.true);
                await testIntegrationUtils_1.eventuallyOk(() => chai_1.expect(bClose.called).to.be.true);
                dispose();
            });
        });
    }
});
//# sourceMappingURL=cdpTransport.test.js.map
//# sourceMappingURL=cdpTransport.test.js.map
