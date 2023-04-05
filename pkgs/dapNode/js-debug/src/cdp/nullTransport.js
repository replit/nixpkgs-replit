"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullTransport = void 0;
const events_1 = require("../common/events");
const hrnow_1 = require("../common/hrnow");
class NullTransport {
    constructor() {
        this.onMessageEmitter = new events_1.EventEmitter();
        this.onEndEmitter = new events_1.EventEmitter();
        this.onDidSendEmitter = new events_1.EventEmitter();
        this.onMessage = this.onMessageEmitter.event;
        this.onEnd = this.onEndEmitter.event;
    }
    /**
     * Sends a message to the attached CDP Connection instance.
     */
    injectMessage(message) {
        this.onMessageEmitter.fire([JSON.stringify(message), new hrnow_1.HrTime()]);
    }
    /**
     * @inheritdoc
     */
    send(message) {
        this.onDidSendEmitter.fire(JSON.parse(message));
    }
    dispose() {
        // no-op
    }
}
exports.NullTransport = NullTransport;
//# sourceMappingURL=nullTransport.js.map
//# sourceMappingURL=nullTransport.js.map
