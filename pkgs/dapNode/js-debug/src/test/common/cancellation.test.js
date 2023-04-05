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
const assert = __importStar(require("assert"));
const chai_1 = require("chai");
const cancellation_1 = require("../../common/cancellation");
const promiseUtil_1 = require("../../common/promiseUtil");
describe('CancellationToken', () => {
    it('None', () => {
        chai_1.expect(cancellation_1.NeverCancelled.isCancellationRequested).to.equal(false);
        chai_1.expect(typeof cancellation_1.NeverCancelled.onCancellationRequested).to.equal('function');
    });
    it('cancel before token', function (done) {
        const source = new cancellation_1.CancellationTokenSource();
        chai_1.expect(source.token.isCancellationRequested).to.equal(false);
        source.cancel();
        chai_1.expect(source.token.isCancellationRequested).to.equal(true);
        source.token.onCancellationRequested(() => {
            assert.ok(true);
            done();
        });
    });
    it('cancel happens only once', () => {
        const source = new cancellation_1.CancellationTokenSource();
        chai_1.expect(source.token.isCancellationRequested).to.equal(false);
        let cancelCount = 0;
        function onCancel() {
            cancelCount += 1;
        }
        source.token.onCancellationRequested(onCancel);
        source.cancel();
        source.cancel();
        chai_1.expect(cancelCount).to.equal(1);
    });
    it('cancel calls all listeners', () => {
        let count = 0;
        const source = new cancellation_1.CancellationTokenSource();
        source.token.onCancellationRequested(() => {
            count += 1;
        });
        source.token.onCancellationRequested(() => {
            count += 1;
        });
        source.token.onCancellationRequested(() => {
            count += 1;
        });
        source.cancel();
        chai_1.expect(count).to.equal(3);
    });
    it('token stays the same', () => {
        let source = new cancellation_1.CancellationTokenSource();
        let token = source.token;
        assert.ok(token === source.token); // doesn't change on get
        source.cancel();
        assert.ok(token === source.token); // doesn't change after cancel
        source.cancel();
        assert.ok(token === source.token); // doesn't change after 2nd cancel
        source = new cancellation_1.CancellationTokenSource();
        source.cancel();
        token = source.token;
        assert.ok(token === source.token); // doesn't change on get
    });
    it('dispose calls no listeners', () => {
        let count = 0;
        const source = new cancellation_1.CancellationTokenSource();
        source.token.onCancellationRequested(() => {
            count += 1;
        });
        source.dispose();
        source.cancel();
        chai_1.expect(count).to.equal(0);
    });
    it('dispose calls no listeners (unless told to cancel)', () => {
        let count = 0;
        const source = new cancellation_1.CancellationTokenSource();
        source.token.onCancellationRequested(() => {
            count += 1;
        });
        source.dispose(true);
        // source.cancel();
        chai_1.expect(count).to.equal(1);
    });
    it('parent cancels child', () => {
        const parent = new cancellation_1.CancellationTokenSource();
        const child = new cancellation_1.CancellationTokenSource(parent.token);
        let count = 0;
        child.token.onCancellationRequested(() => (count += 1));
        parent.cancel();
        chai_1.expect(count).to.equal(1);
        chai_1.expect(child.token.isCancellationRequested).to.equal(true);
        chai_1.expect(parent.token.isCancellationRequested).to.equal(true);
    });
    describe('cancellableRace', () => {
        it('returns the value when no cancellation is requested', async () => {
            const v = await cancellation_1.timeoutPromise(Promise.resolve(42), cancellation_1.NeverCancelled);
            chai_1.expect(v).to.equal(42);
        });
        it('throws if cancellation is requested', async () => {
            try {
                await cancellation_1.timeoutPromise(Promise.resolve(42), cancellation_1.Cancelled);
                throw new Error('expected to throw');
            }
            catch (e) {
                if (e instanceof cancellation_1.TaskCancelledError) {
                    chai_1.expect(e.message).to.equal('Task cancelled');
                }
                else {
                    throw e;
                }
            }
        });
        it('throws if lazy cancellation is requested', async () => {
            try {
                await cancellation_1.timeoutPromise(promiseUtil_1.delay(1000), cancellation_1.CancellationTokenSource.withTimeout(3).token, 'Could not do the thing');
                throw new Error('expected to throw');
            }
            catch (e) {
                if (e instanceof cancellation_1.TaskCancelledError) {
                    chai_1.expect(e.message).to.equal('Could not do the thing');
                }
                else {
                    throw e;
                }
            }
        });
    });
});
//# sourceMappingURL=cancellation.test.js.map
//# sourceMappingURL=cancellation.test.js.map
