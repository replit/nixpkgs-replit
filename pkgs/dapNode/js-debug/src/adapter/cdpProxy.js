"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpProxyProvider = exports.ICdpProxyProvider = void 0;
const crypto_1 = require("crypto");
const inversify_1 = require("inversify");
const connection_1 = require("../cdp/connection");
const disposable_1 = require("../common/disposable");
const logging_1 = require("../common/logging");
const portLeaseTracker_1 = require("./portLeaseTracker");
const jsDebugDomain = 'JsDebug';
const eventWildcard = '*';
/**
 * Handles replaying events from domains. Certain events are only fired when
 * a domain is first enabled, so subsequent connections may not receive it.
 */
class DomainReplays {
    constructor() {
        this.replays = new Map();
    }
    /**
     * Adds a message to be replayed.
     */
    addReplay(domain, event, params) {
        const obj = { event: `${domain}.${event}`, params: params };
        const arr = this.replays.get(domain);
        if (arr) {
            arr.push(obj);
        }
        else {
            this.replays.set(domain, [obj]);
        }
    }
    /**
     * Captures replay for the event on CDP.
     */
    capture(cdp, domain, event) {
        cdp[domain].on(event, evt => this.addReplay(domain, event, evt));
    }
    /**
     * Filters replayed events.
     */
    filterReply(domain, filterFn) {
        const arr = this.replays.get(domain);
        if (!arr) {
            return;
        }
        this.replays.set(domain, arr.filter(filterFn));
    }
    /**
     * Removes all replay info for a domain.
     */
    clear(domain) {
        this.replays.delete(domain);
    }
    /**
     * Gets replay messages for the given domain.
     */
    read(domain) {
        var _a;
        return (_a = this.replays.get(domain)) !== null && _a !== void 0 ? _a : [];
    }
}
exports.ICdpProxyProvider = Symbol('ICdpProxyProvider');
/**
 * Implementation of the {@link ICdpProxyProvider}
 */
let CdpProxyProvider = class CdpProxyProvider {
    constructor(cdp, portTracker, logger) {
        this.cdp = cdp;
        this.portTracker = portTracker;
        this.logger = logger;
        this.disposables = new disposable_1.DisposableList();
        this.replay = new DomainReplays();
        this.jsDebugApi = {
            /** @inheritdoc */
            subscribe: (handle, { events }) => {
                for (const event of events) {
                    if (event.endsWith(eventWildcard)) {
                        handle.pushDisposable(this.cdp.session.onPrefix(event.slice(0, -eventWildcard.length), c => handle.send({ method: c.method, params: c.params })));
                    }
                    else {
                        handle.pushDisposable(this.cdp.session.on(event, params => handle.send({ method: event, params })));
                    }
                }
                return {};
            },
        };
        this.replay.capture(cdp, 'CSS', 'styleSheetAdded');
        cdp.CSS.on('fontsUpdated', evt => {
            if (evt.font) {
                this.replay.addReplay('CSS', 'fontsUpdated', evt);
            }
        });
        cdp.CSS.on('styleSheetRemoved', evt => this.replay.filterReply('CSS', s => s.params.styleSheetId !== evt.styleSheetId));
    }
    /**
     * Acquires the proxy server, and returns its address.
     */
    async proxy() {
        if (!this.server) {
            this.server = this.createServer();
        }
        const { server, path } = await this.server;
        const addr = server.address();
        return { host: addr.address, port: addr.port, path };
    }
    async createServer() {
        const path = `/${crypto_1.randomBytes(20).toString('hex')}`;
        const server = await portLeaseTracker_1.acquireTrackedWebSocketServer(this.portTracker, {
            perMessageDeflate: true,
            path,
        });
        this.logger.info("proxyActivity" /* ProxyActivity */, 'activated cdp proxy');
        server.on('connection', client => {
            const clientHandle = new ClientHandle(client);
            this.logger.info("proxyActivity" /* ProxyActivity */, 'accepted proxy connection', { id: clientHandle.id });
            client.on('close', () => {
                this.logger.verbose("proxyActivity" /* ProxyActivity */, 'closed proxy connection', {
                    id: clientHandle.id,
                });
                this.disposables.disposeObject(clientHandle);
            });
            client.on('message', async (d) => {
                let message;
                try {
                    message = JSON.parse(d.toString());
                }
                catch (e) {
                    return clientHandle.send({
                        id: 0,
                        error: { code: -32700 /* ParseError */, message: e.message },
                    });
                }
                this.logger.verbose("proxyActivity" /* ProxyActivity */, 'received proxy message', message);
                const { method, params, id = 0 } = message;
                const [domain, fn] = method.split('.');
                try {
                    const result = domain === jsDebugDomain
                        ? await this.invokeJsDebugDomainMethod(clientHandle, fn, params)
                        : await this.invokeCdpMethod(clientHandle, domain, fn, params);
                    clientHandle.send({ id, result });
                }
                catch (e) {
                    const error = e instanceof connection_1.ProtocolError && e.cause ? e.cause : { code: 0, message: e.message };
                    clientHandle.send({ id, error });
                }
            });
        });
        return { server, path };
    }
    /**
     * @inheritdoc
     */
    dispose() {
        var _a;
        this.disposables.dispose();
        (_a = this.server) === null || _a === void 0 ? void 0 : _a.then(s => s.server.close());
        this.server = undefined;
    }
    invokeCdpMethod(client, domain, method, params) {
        const promise = this.cdp.session.sendOrDie(`${domain}.${method}`, params);
        switch (method) {
            case 'enable':
                this.replay
                    .read(domain)
                    .forEach(m => client.send({ method: m.event, params: m.params }));
                break;
            case 'disable':
                this.replay.clear(domain);
                break;
            default:
            // no-op
        }
        // it's intentional that replay is sent before the
        // enabled response; this is what Chrome does.
        return promise;
    }
    invokeJsDebugDomainMethod(handle, method, params) {
        if (!this.jsDebugApi.hasOwnProperty(method)) {
            throw new connection_1.ProtocolError(method).setCause(-32601 /* MethodNotFound */, `${jsDebugDomain}.${method} not found`);
        }
        return this.jsDebugApi[method](handle, params);
    }
};
CdpProxyProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.ICdpApi)),
    __param(1, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker)),
    __param(2, inversify_1.inject(logging_1.ILogger))
], CdpProxyProvider);
exports.CdpProxyProvider = CdpProxyProvider;
let connectionIdCounter = 0;
class ClientHandle {
    constructor(webSocket) {
        this.webSocket = webSocket;
        this.disposables = new disposable_1.DisposableList();
        this.id = connectionIdCounter++;
    }
    pushDisposable(d) {
        this.disposables.push(d);
    }
    dispose() {
        this.disposables.dispose();
        this.webSocket.close();
    }
    send(message) {
        this.webSocket.send(JSON.stringify(message));
    }
}
//# sourceMappingURL=cdpProxy.js.map
//# sourceMappingURL=cdpProxy.js.map
