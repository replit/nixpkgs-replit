"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerTransport = void 0;
const disposable_1 = require("../common/disposable");
const events_1 = require("../common/events");
const hrnow_1 = require("../common/hrnow");
/**
 * Transport used for debugging node worker threads over the NodeTarget API.
 */
class WorkerTransport {
    constructor(sessionId, sink) {
        this.sessionId = sessionId;
        this.sink = sink;
        this.onMessageEmitter = new events_1.EventEmitter();
        this.onEndEmitter = new events_1.EventEmitter();
        this.disposables = new disposable_1.DisposableList();
        this.onMessage = this.onMessageEmitter.event;
        this.onEnd = this.onEndEmitter.event;
        this.disposables.push(sink.NodeWorker.on('detachedFromWorker', evt => {
            if (evt.sessionId === sessionId) {
                this.onEndEmitter.fire();
                this.dispose();
            }
        }), sink.NodeWorker.on('receivedMessageFromWorker', evt => {
            if (evt.sessionId === sessionId) {
                this.onMessageEmitter.fire([evt.message, new hrnow_1.HrTime()]);
            }
        }));
    }
    send(message) {
        this.sink.NodeWorker.sendMessageToWorker({ message, sessionId: this.sessionId });
    }
    dispose() {
        if (!this.disposables.isDisposed) {
            this.disposables.dispose();
            this.onEndEmitter.fire();
        }
    }
}
exports.WorkerTransport = WorkerTransport;
//# sourceMappingURL=workerTransport.js.map
//# sourceMappingURL=workerTransport.js.map
