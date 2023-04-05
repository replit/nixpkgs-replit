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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullTelemetryReporter = void 0;
const events_1 = require("../common/events");
const inversify_1 = require("inversify");
let NullTelemetryReporter = class NullTelemetryReporter {
    constructor() {
        this.flushEmitter = new events_1.EventEmitter();
        this.onFlush = this.flushEmitter.event;
    }
    /**
     * @inheritdoc
     */
    report() {
        // no-op
    }
    /**
     * @inheritdoc
     */
    reportOperation() {
        // no-op
    }
    /**
     * @inheritdoc
     */
    attachDap() {
        // no-op
    }
    /**
     * @inheritdoc
     */
    flush() {
        this.flushEmitter.fire();
    }
    dispose() {
        // no-op
    }
};
NullTelemetryReporter = __decorate([
    inversify_1.injectable()
], NullTelemetryReporter);
exports.NullTelemetryReporter = NullTelemetryReporter;
//# sourceMappingURL=nullTelemetryReporter.js.map
//# sourceMappingURL=nullTelemetryReporter.js.map
