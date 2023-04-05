"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const promiseUtil_1 = require("../../common/promiseUtil");
const reservationQueue_1 = require("./reservationQueue");
describe('ReservationQueue', () => {
    let sunk;
    let queue;
    beforeEach(() => {
        sunk = [];
        queue = new reservationQueue_1.ReservationQueue(items => {
            sunk.push(items);
            if (items.includes(-1)) {
                queue.dispose();
            }
        });
    });
    it('enqueues sync', () => {
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        chai_1.expect(sunk).to.deep.equal([[1], [2], [3]]);
    });
    it('enqueues async with order', async () => {
        queue.enqueue(promiseUtil_1.delay(6).then(() => 1));
        queue.enqueue(promiseUtil_1.delay(2).then(() => 2));
        queue.enqueue(promiseUtil_1.delay(4).then(() => 3));
        await promiseUtil_1.delay(10);
        chai_1.expect(sunk).to.deep.equal([[1, 2, 3]]);
    });
    it('bulks after async resolution', async () => {
        queue.enqueue(1);
        queue.enqueue(promiseUtil_1.delay(6).then(() => 2));
        queue.enqueue(promiseUtil_1.delay(2).then(() => 3));
        queue.enqueue(4);
        queue.enqueue(promiseUtil_1.delay(4).then(() => 5));
        queue.enqueue(promiseUtil_1.delay(8).then(() => 6));
        await promiseUtil_1.delay(10);
        chai_1.expect(sunk).to.deep.equal([[1], [2, 3, 4, 5], [6]]);
    });
    it('stops when disposed', async () => {
        queue.enqueue(promiseUtil_1.delay(2).then(() => 1));
        queue.enqueue(promiseUtil_1.delay(4).then(() => -1));
        queue.enqueue(promiseUtil_1.delay(6).then(() => 3));
        await promiseUtil_1.delay(4);
        chai_1.expect(sunk).to.deep.equal([[1], [-1]]);
    });
});
//# sourceMappingURL=reservationQueue.test.js.map
//# sourceMappingURL=reservationQueue.test.js.map
