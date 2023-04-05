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
exports.RemoteBrowserHelper = void 0;
const inversify_1 = require("inversify");
const portLeaseTracker_1 = require("../../adapter/portLeaseTracker");
const gzipPipeTransport_1 = require("../../cdp/gzipPipeTransport");
const cancellation_1 = require("../../common/cancellation");
const logging_1 = require("../../common/logging");
const promiseUtil_1 = require("../../common/promiseUtil");
let launchIdCounter = 0;
let RemoteBrowserHelper = class RemoteBrowserHelper {
    constructor(logger, portLeaseTracker) {
        this.logger = logger;
        this.portLeaseTracker = portLeaseTracker;
        /**
         * Transports to launch ID.
         */
        this.teardown = new WeakMap();
    }
    /**
     * Launches the browser in the companion app, and return the transport.
     */
    async launch(dap, cancellationToken, params) {
        if (this.server) {
            this.server.close();
        }
        const connection = promiseUtil_1.getDeferred();
        const server = (this.server = await portLeaseTracker_1.acquireTrackedServer(this.portLeaseTracker, connection.resolve));
        const launchId = ++launchIdCounter;
        dap.launchBrowserInCompanion(Object.assign(Object.assign({}, params), { serverPort: server.address().port, launchId }));
        const socket = await cancellation_1.timeoutPromise(connection.promise, cancellationToken, 'Timed out waiting for browser connection');
        const transport = new gzipPipeTransport_1.GzipPipeTransport(this.logger, socket);
        this.teardown.set(transport, () => dap.killCompanionBrowser({ launchId }));
        return transport;
    }
    /**
     * Kills the companion associated with the given transport.
     */
    close(transport) {
        var _a;
        (_a = this.teardown.get(transport)) === null || _a === void 0 ? void 0 : _a();
    }
    /**
     * @inheritdoc
     */
    dispose() {
        var _a;
        (_a = this.server) === null || _a === void 0 ? void 0 : _a.close();
        this.server = undefined;
    }
};
RemoteBrowserHelper = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger)),
    __param(1, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker))
], RemoteBrowserHelper);
exports.RemoteBrowserHelper = RemoteBrowserHelper;
//# sourceMappingURL=remoteBrowserHelper.js.map
//# sourceMappingURL=remoteBrowserHelper.js.map
