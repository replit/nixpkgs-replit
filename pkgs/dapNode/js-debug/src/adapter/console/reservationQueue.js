"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationQueue = void 0;
const events_1 = require("../../common/events");
/**
 * A queue that allows inserting items that are built asynchronously, while
 * preserving insertion order.
 */
class ReservationQueue {
    constructor(sink) {
        this.sink = sink;
        this.q = [];
        this.disposed = false;
        this.onDrainedEmitter = new events_1.EventEmitter();
        /**
         * Fires when the queue is drained.
         */
        this.onDrained = this.onDrainedEmitter.event;
    }
    /**
     * Gets the current length of the queue.
     */
    get length() {
        return this.q.length;
    }
    /**
     * Enqueues an item or a promise for an item in the queue.
     */
    enqueue(value) {
        if (this.disposed) {
            return;
        }
        this.q.push(new Reservation(value));
        if (this.q.length === 1) {
            this.process();
        }
    }
    /**
     * Cancels processing of all pending items.
     * @inheritdoc
     */
    dispose() {
        this.disposed = true;
        this.q = [];
    }
    async process() {
        const toIndex = this.q.findIndex(r => r.value === unsettled);
        if (toIndex === 0) {
            await this.q[0].wait;
        }
        else if (toIndex === -1) {
            this.sink(extractResolved(this.q));
            this.q = [];
        }
        else {
            this.sink(extractResolved(this.q.slice(0, toIndex)));
            this.q = this.q.slice(toIndex);
        }
        if (this.q.length) {
            this.process();
        }
        else {
            this.onDrainedEmitter.fire();
        }
    }
}
exports.ReservationQueue = ReservationQueue;
const extractResolved = (list) => list.map(i => i.value).filter((v) => v !== rejected);
const unsettled = Symbol('unsettled');
const rejected = Symbol('unsettled');
/**
 * Item in the queue.
 */
class Reservation {
    constructor(rawValue) {
        /**
         * Current value, or an indication that the promise is pending or rejected.
         */
        this.value = unsettled;
        if (!(rawValue instanceof Promise)) {
            this.value = rawValue;
            this.wait = Promise.resolve();
        }
        else {
            this.wait = rawValue.then(r => {
                this.value = r;
            }, () => {
                this.value = rejected;
            });
        }
    }
}
//# sourceMappingURL=reservationQueue.js.map
//# sourceMappingURL=reservationQueue.js.map
