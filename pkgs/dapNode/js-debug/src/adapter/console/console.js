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
exports.Console = void 0;
const inversify_1 = require("inversify");
const objUtils_1 = require("../../common/objUtils");
const connection_1 = require("../../dap/connection");
const consoleMessage_1 = require("./consoleMessage");
const reservationQueue_1 = require("./reservationQueue");
const textualMessage_1 = require("./textualMessage");
const duplicateNodeJsLogFunctions = new Set(['group', 'assert', 'count']);
let Console = class Console {
    constructor(dap) {
        this.dap = dap;
        this.isDirty = false;
        this.queue = new reservationQueue_1.ReservationQueue(events => {
            for (const event of events) {
                this.dap.output(event);
            }
        });
        /**
         * Fires when the queue is drained.
         */
        this.onDrained = this.queue.onDrained;
    }
    /**
     * Gets the current length of the queue.
     */
    get length() {
        return this.queue.length;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.queue.dispose();
    }
    /**
     * @inheritdoc
     */
    dispatch(thread, event) {
        const parsed = this.parse(event);
        if (parsed) {
            this.enqueue(thread, parsed);
        }
    }
    /**
     * @inheritdoc
     */
    enqueue(thread, message) {
        if (!(message instanceof consoleMessage_1.ClearMessage)) {
            this.isDirty = true;
        }
        else if (this.isDirty) {
            this.isDirty = false;
        }
        else {
            return;
        }
        this.queue.enqueue(message.toDap(thread));
    }
    /**
     * @inheritdoc
     */
    parse(event) {
        var _a;
        if (event.type === 'log') {
            // Ignore the duplicate group events that Node.js can emit:
            // See: https://github.com/nodejs/node/issues/31973
            const firstFrame = (_a = event.stackTrace) === null || _a === void 0 ? void 0 : _a.callFrames[0];
            if (firstFrame &&
                firstFrame.url === 'internal/console/constructor.js' &&
                duplicateNodeJsLogFunctions.has(firstFrame.functionName)) {
                return;
            }
        }
        switch (event.type) {
            case 'clear':
                return new consoleMessage_1.ClearMessage();
            case 'endGroup':
                return new consoleMessage_1.EndGroupMessage();
            case 'assert':
                return new textualMessage_1.AssertMessage(event);
            case 'table':
                return new textualMessage_1.TableMessage(event);
            case 'startGroup':
            case 'startGroupCollapsed':
                return new textualMessage_1.StartGroupMessage(event);
            case 'debug':
            case 'log':
            case 'info':
                return new textualMessage_1.LogMessage(event);
            case 'trace':
                return new textualMessage_1.TraceMessage(event);
            case 'error':
                return new textualMessage_1.ErrorMessage(event);
            case 'warning':
                return new textualMessage_1.WarningMessage(event);
            case 'dir':
            case 'dirxml':
                return new textualMessage_1.LogMessage(event); // a normal object inspection
            case 'count':
                return new textualMessage_1.LogMessage(event); // contents are like a normal log
            case 'profile':
            case 'profileEnd':
                return new textualMessage_1.LogMessage(event); // non-standard events, not implemented in Chrome it seems
            case 'timeEnd':
                return new textualMessage_1.LogMessage(event); // contents are like a normal log
            default:
                try {
                    objUtils_1.assertNever(event.type, 'unknown console message type');
                }
                catch (_b) {
                    // ignore
                }
        }
    }
};
Console = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.IDapApi))
], Console);
exports.Console = Console;
//# sourceMappingURL=console.js.map
//# sourceMappingURL=console.js.map
