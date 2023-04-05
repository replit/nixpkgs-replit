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
exports.WatchDog = void 0;
const net = __importStar(require("net"));
const rawPipeTransport_1 = require("../../cdp/rawPipeTransport");
const webSocketTransport_1 = require("../../cdp/webSocketTransport");
const cancellation_1 = require("../../common/cancellation");
const events_1 = require("../../common/events");
const logger_1 = require("../../common/logging/logger");
const createTargetId_1 = require("./createTargetId");
class WatchDog {
    constructor(info, server) {
        var _a;
        this.info = info;
        this.server = server;
        this.onEndEmitter = new events_1.EventEmitter();
        this.gracefulExit = false;
        this.targetAlive = false;
        this.targetInfo = {
            targetId: (_a = this.info.ownId) !== null && _a !== void 0 ? _a : createTargetId_1.createTargetId(),
            processId: Number(this.info.pid) || 0,
            type: this.info.waitForDebugger ? 'waitingForDebugger' : '',
            title: this.info.scriptName,
            url: 'file://' + this.info.scriptName,
            openerId: this.info.openerId,
            attached: true,
            canAccessOpener: false,
            processInspectorPort: Number(new URL(this.info.inspectorURL).port),
        };
        /**
         * Event that fires when the watchdog stops.
         */
        this.onEnd = this.onEndEmitter.event;
        this.listenToServer();
    }
    /**
     * Gets whether the attached process is still running.
     */
    get isTargetAlive() {
        return this.targetAlive;
    }
    /**
     * Creates a watchdog and returns a promise that resolves once it's attached
     * to the server.
     */
    static async attach(info) {
        const pipe = await new Promise((resolve, reject) => {
            const cnx = net.createConnection(info.ipcAddress, () => resolve(cnx));
            cnx.on('error', reject);
        });
        const server = new rawPipeTransport_1.RawPipeTransport(logger_1.Logger.null, pipe);
        return new WatchDog(info, server);
    }
    /**
     * Attaches listeners to server messages to start passing them to the target.
     * Should be called once when the watchdog is created.
     */
    listenToServer() {
        const { server, targetInfo } = this;
        server.send(JSON.stringify({ method: 'Target.targetCreated', params: { targetInfo } }));
        server.onMessage(async ([data]) => {
            // Fast-path to check if we might need to parse it:
            if (this.target &&
                !data.includes("Target.attachToTarget" /* AttachToTarget */) &&
                !data.includes("Target.detachFromTarget" /* DetachFromTarget */)) {
                this.target.send(data);
                return;
            }
            const result = await this.execute(data);
            if (result) {
                server.send(JSON.stringify(result));
            }
        });
        server.onEnd(() => {
            this.disposeTarget();
            this.onEndEmitter.fire({ killed: this.gracefulExit, code: this.gracefulExit ? 0 : 1 });
        });
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.gracefulExit = true;
        this.disposeTarget();
        this.server.dispose(); // will cause the end emitter to fire after teardown finishes
    }
    /**
     * Dispatches a method call, invoked with a JSON string and returns a
     * response to return.
     */
    async execute(data) {
        var _a;
        const object = JSON.parse(data);
        switch (object.method) {
            case "Target.attachToTarget" /* AttachToTarget */:
                if (this.target) {
                    this.disposeTarget();
                }
                this.target = await this.createTarget();
                return {
                    id: object.id,
                    result: {
                        sessionId: this.targetInfo.targetId,
                        __dynamicAttach: this.info.dynamicAttach ? true : undefined,
                    },
                };
            case "Target.detachFromTarget" /* DetachFromTarget */:
                this.gracefulExit = true;
                this.disposeTarget();
                return { id: object.id, result: {} };
            default:
                (_a = this.target) === null || _a === void 0 ? void 0 : _a.send(object);
                return;
        }
    }
    async createTarget() {
        this.gracefulExit = false; // reset
        const target = await webSocketTransport_1.WebSocketTransport.create(this.info.inspectorURL, cancellation_1.NeverCancelled);
        target.onMessage(([data]) => this.server.send(data));
        target.onEnd(() => {
            if (target) {
                // Could be due us closing.
                this.server.send(JSON.stringify({
                    method: 'Target.targetDestroyed',
                    params: { targetId: this.targetInfo.targetId, sessionId: this.targetInfo.targetId },
                }));
            }
            this.targetAlive = false;
            this.server.dispose();
        });
        return target;
    }
    disposeTarget() {
        if (this.target) {
            this.target.dispose();
            this.target = undefined;
        }
    }
}
exports.WatchDog = WatchDog;
//# sourceMappingURL=watchdogSpawn.js.map
//# sourceMappingURL=watchdogSpawn.js.map
