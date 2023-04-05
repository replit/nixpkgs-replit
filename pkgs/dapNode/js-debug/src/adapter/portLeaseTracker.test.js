"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const promiseUtil_1 = require("../common/promiseUtil");
const portLeaseTracker_1 = require("./portLeaseTracker");
describe('PortLeaseTracker', () => {
    it('registers in use and not in use', async () => {
        const l = new portLeaseTracker_1.PortLeaseTracker('local');
        chai_1.expect(await l.isRegistered(1000)).to.be.false;
        l.register(1000);
        chai_1.expect(await l.isRegistered(1000)).to.be.true;
    });
    it('does not delay for ports outside default range', async () => {
        const l = new portLeaseTracker_1.PortLeaseTracker('local');
        chai_1.expect(await Promise.race([l.isRegistered(1000), promiseUtil_1.delay(5).then(() => 'error')])).to.be.false;
    });
    it('delays for ports in range', async () => {
        const l = new portLeaseTracker_1.PortLeaseTracker('local');
        const p = 53000 /* Min */;
        setTimeout(() => l.register(p), 20);
        chai_1.expect(await l.isRegistered(p)).to.be.true;
    });
    it('mandates correctly', async () => {
        chai_1.expect(new portLeaseTracker_1.PortLeaseTracker('local').isMandated).to.be.false;
        chai_1.expect(new portLeaseTracker_1.PortLeaseTracker('remote').isMandated).to.be.true;
    });
});
//# sourceMappingURL=portLeaseTracker.test.js.map
//# sourceMappingURL=portLeaseTracker.test.js.map
